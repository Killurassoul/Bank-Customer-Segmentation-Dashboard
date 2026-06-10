import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import numpy as np

# Styling constants for consistency
DARK_BG = "rgba(10, 14, 26, 0.7)"
ACCENT_CYAN = "#00D4FF"
ACCENT_GOLD = "#FFB800"
DARK_THEME_LAYOUT = {
    "template": "plotly_dark",
    "paper_bgcolor": "rgba(0,0,0,0)",
    "plot_bgcolor": "rgba(0,0,0,0)",
    "font_family": "Space Grotesk, sans-serif",
    "margin": dict(l=40, r=40, t=50, b=40)
}

def create_2d_projection_scatter(df: pd.DataFrame, method: str = "PCA") -> go.Figure:
    """
    Renders 2D Scatter plot using PCA or t-SNE coordinates.
    Marker size represents account balance (normalized for visibility).
    """
    x_col = "pca_1" if method == "PCA" else "tsne_1"
    y_col = "pca_2" if method == "PCA" else "tsne_2"
    
    # Calculate a non-zero marker size based on account balance
    # Use logarithmic scaling or robust normalization
    min_size = 6
    max_size = 28
    bal = df["account_balance"].values
    if bal.max() == bal.min():
        sizes = [12] * len(df)
    else:
        sizes = min_size + (bal - bal.min()) / (bal.max() - bal.min()) * (max_size - min_size)
        
    fig = px.scatter(
        df,
        x=x_col,
        y=y_col,
        color="cluster_name",
        hover_data={
            "customer_id": True,
            "cluster_name": True,
            "age": True,
            "annual_income": ":$,.0f",
            "spending_score": True,
            "account_balance": ":$,.0f",
            "credit_score": True
        },
        title=f"Customer Distribution in 2D Space ({method} Projection)",
        labels={x_col: f"{method} Component 1", y_col: f"{method} Component 2", "cluster_name": "Segment"},
        color_discrete_sequence=px.colors.qualitative.Bold
    )
    
    fig.update_traces(
        marker=dict(
            size=sizes,
            opacity=0.85,
            line=dict(width=1, color="rgba(255,255,255,0.4)")
        )
    )
    
    fig.update_layout(**DARK_THEME_LAYOUT)
    fig.update_xaxes(showgrid=True, gridcolor="rgba(255,255,255,0.05)")
    fig.update_yaxes(showgrid=True, gridcolor="rgba(255,255,255,0.05)")
    
    return fig

def create_cluster_dist_pie(df: pd.DataFrame) -> go.Figure:
    """
    Renders a donut chart with customer distribution per cluster.
    """
    dist = df["cluster_name"].value_counts().reset_index()
    dist.columns = ["Segment", "Count"]
    
    fig = px.pie(
        dist,
        values="Count",
        names="Segment",
        hole=0.45,
        title="Segment Distribution & Share",
        color_discrete_sequence=px.colors.qualitative.Bold
    )
    
    fig.update_layout(**DARK_THEME_LAYOUT)
    fig.update_traces(
        textposition="inside", 
        textinfo="percent+label",
        marker=dict(line=dict(color="rgba(10, 14, 26, 0.9)", width=2))
    )
    
    return fig

def create_radar_profiles(df: pd.DataFrame) -> go.Figure:
    """
    Renders a radar chart showing normalized cluster centroids.
    Features scaled 0-1 for a fair comparative representation.
    """
    features = ["age", "annual_income", "spending_score", "credit_score", "account_balance", "num_products"]
    
    # Calculate group means
    grouped = df.groupby("cluster_name")[features].mean()
    
    # Min-max scale the group means across each feature (0 to 1 scaling)
    # This ensures a beautiful balanced radar compared to absolute numbers
    norm_grouped = grouped.copy()
    for col in features:
        col_min = df[col].min()
        col_max = df[col].max()
        if col_max > col_min:
            norm_grouped[col] = (grouped[col] - col_min) / (col_max - col_min)
        else:
            norm_grouped[col] = 0.5
            
    fig = go.Figure()
    
    colors = px.colors.qualitative.Bold
    
    # Readable feature labels for the circular axes
    feature_labels = [col.replace("_", " ").title() for col in features]
    
    for idx, (cluster_name, row) in enumerate(norm_grouped.iterrows()):
        color = colors[idx % len(colors)]
        
        # Radar loop demands first element repeated at the end
        r_vals = row.values.tolist() + [row.values[0]]
        theta_vals = feature_labels + [feature_labels[0]]
        
        fig.add_trace(go.Scatterpolar(
            r=r_vals,
            theta=theta_vals,
            fill='toself',
            name=cluster_name,
            line=dict(color=color, width=2.5),
            fillcolor=f"rgba({','.join(map(str, [int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)]))}, 0.155)" if color.startswith('#') else None
        ))
        
    fig.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 1],
                gridcolor="rgba(255, 255, 255, 0.08)",
                showticklabels=False
            ),
            angularaxis=dict(
                gridcolor="rgba(255, 255, 255, 0.08)",
                tickfont=dict(size=11)
            ),
            bgcolor="rgba(0,0,0,0)"
        ),
        title="Segment Feature Overlays (Normalized)",
        showlegend=True,
        **DARK_THEME_LAYOUT
    )
    
    return fig

def create_feature_grouped_bar(df: pd.DataFrame, chosen_feature: str) -> go.Figure:
    """
    Renders grouped bar chart detailing average metrics across clusters for a chosen feature.
    """
    features_clean = chosen_feature.replace("_", " ").title()
    
    grouped = df.groupby("cluster_name")[chosen_feature].mean().reset_index()
    grouped = grouped.sort_values(by=chosen_feature, ascending=False)
    
    fig = px.bar(
        grouped,
        x="cluster_name",
        y=chosen_feature,
        color="cluster_name",
        title=f"Average {features_clean} per Segment",
        labels={chosen_feature: features_clean, "cluster_name": "Segment"},
        color_discrete_sequence=px.colors.qualitative.Bold
    )
    
    fig.update_layout(**DARK_THEME_LAYOUT)
    fig.update_xaxes(showgrid=False)
    fig.update_yaxes(showgrid=True, gridcolor="rgba(255,255,255,0.05)")
    fig.update_layout(showlegend=False)
    
    return fig

def create_elbow_plot(wcss_list: list, current_k: int) -> go.Figure:
    """
    Renders line chart tracking WCSS per cluster volume.
    Highlights user's current selected cluster parameter k.
    """
    k_vals = list(range(1, len(wcss_list) + 1))
    
    fig = go.Figure()
    
    # Core curve
    fig.add_trace(go.Scatter(
        x=k_vals,
        y=wcss_list,
        mode="lines+markers",
        name="WCSS",
        line=dict(color=ACCENT_CYAN, width=3),
        marker=dict(size=8, color=ACCENT_GOLD, line=dict(color="#0A0E1A", width=1.5))
    ))
    
    # Highlight vertical marker
    fig.add_vline(
        x=current_k,
        line_width=2,
        line_dash="dash",
        line_color="#FF4B4B",
        annotation_text=f"Selected Support: k={current_k}",
        annotation_position="top right",
        annotation_font_color="#FF4B4B"
    )
    
    fig.update_layout(
        title="Elbow Optimizer (WCSS vs Cluster Count)",
        xaxis=dict(title="Cluster Count (k)", tickmode="linear", tick0=1, dtick=1),
        yaxis=dict(title="Inertia / WCSS", gridcolor="rgba(255,255,255,0.05)"),
        **DARK_THEME_LAYOUT
    )
    
    return fig

def create_silhouette_barchart(df: pd.DataFrame) -> go.Figure:
    """
    Renders a clean summary of mean silhouette scores across segments.
    Applies colors as designated: Green for strong, Amber for modest, Red for low confidence.
    """
    grouped = df.groupby("cluster_name")["silhouette_score"].mean().reset_index()
    
    colors = []
    for val in grouped["silhouette_score"]:
        if val > 0.5:
            colors.append("#2ECC71")  # Green
        elif val >= 0.3:
            colors.append("#F1C40F")  # Yellow
        else:
            colors.append("#E74C3C")  # Red
            
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        x=grouped["cluster_name"],
        y=grouped["silhouette_score"],
        marker_color=colors,
        text=grouped["silhouette_score"].round(3),
        textposition="auto",
        marker=dict(line=dict(width=1.5, color="rgba(0,0,0,0.4)"))
    ))
    
    # Add grid logic
    fig.add_hline(y=0.5, line_width=1, line_dash="dash", line_color="rgba(46, 204, 113, 0.4)")
    fig.add_hline(y=0.3, line_width=1, line_dash="dash", line_color="rgba(241, 196, 15, 0.4)")
    
    fig.update_layout(
        title="Silhouette Index by Customer Segment",
        xaxis=dict(title="Segment"),
        yaxis=dict(title="Average Silhouette Score", range=[0, 1], gridcolor="rgba(255,255,255,0.05)"),
        **DARK_THEME_LAYOUT
    )
    
    return fig

def create_correlation_heatmap(df: pd.DataFrame) -> go.Figure:
    """
    Renders a standard dynamic correlation heatmap of financial and profile features.
    """
    features = ["age", "annual_income", "spending_score", "credit_score", "account_balance", "num_products", "tenure_years"]
    corr_matrix = df[features].corr()
    
    labels = [col.replace("_", " ").title() for col in features]
    
    fig = go.Figure(data=go.Heatmap(
        z=corr_matrix.values,
        x=labels,
        y=labels,
        colorscale="RdBu",
        zmin=-1,
        zmax=1,
        text=corr_matrix.values.round(2),
        hoverongaps=False,
        colorscale_title="Correlation"
    ))
    
    fig.update_layout(
        title="Financial & Profile Attribute Correlation Matrix",
        **DARK_THEME_LAYOUT
    )
    
    return fig

def create_single_customer_radar(customer_data: pd.Series, cluster_avg: pd.Series, all_min: pd.Series, all_max: pd.Series) -> go.Figure:
    """
    Renders a radar chart comparing a single chosen customer vs their cluster mean.
    """
    features = ["age", "annual_income", "spending_score", "credit_score", "account_balance", "num_products"]
    feature_labels = [col.replace("_", " ").title() for col in features]
    
    # Scale min-max
    scaled_cust = []
    scaled_clus = []
    
    for col in features:
        denominator = all_max[col] - all_min[col]
        if denominator > 0:
            sc_cu = (customer_data[col] - all_min[col]) / denominator
            sc_cl = (cluster_avg[col] - all_min[col]) / denominator
        else:
            sc_cu = 0.5
            sc_cl = 0.5
        scaled_cust.append(sc_cu)
        scaled_clus.append(sc_cl)
        
    # Radar loop
    scaled_cust = scaled_cust + [scaled_cust[0]]
    scaled_clus = scaled_clus + [scaled_clus[0]]
    labels = feature_labels + [feature_labels[0]]
    
    fig = go.Figure()
    
    # Combined profiles
    fig.add_trace(go.Scatterpolar(
        r=scaled_cust,
        theta=labels,
        fill="toself",
        name=f"Customer #{customer_data['customer_id']}",
        line=dict(color=ACCENT_CYAN, width=2)
    ))
    
    fig.add_trace(go.Scatterpolar(
        r=scaled_clus,
        theta=labels,
        fill="none",
        name="Segment Average",
        line=dict(color=ACCENT_GOLD, width=1.5, dash="dash")
    ))
    
    fig.update_layout(
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 1], gridcolor="rgba(255,255,255,0.06)", showticklabels=False),
            angularaxis=dict(gridcolor="rgba(255,255,255,0.06)", tickfont=dict(size=10)),
            bgcolor="rgba(0,0,0,0)"
        ),
        title=f"Comparative Footprint: Customer vs Segment",
        **DARK_THEME_LAYOUT
    )
    
    return fig
