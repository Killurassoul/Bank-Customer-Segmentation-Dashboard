import streamlit as st
import pandas as pd
import numpy as np

# Set page config as early as possible
st.set_page_config(
    page_title="Bank Customer Segmentation Suite",
    page_icon="🔮",
    layout="wide",
    initial_sidebar_state="expanded"
)

from data.generate_data import generate_customer_data
from models.clustering import perform_clustering, get_elbow_data
from components.charts import (
    create_2d_projection_scatter,
    create_cluster_dist_pie,
    create_radar_profiles,
    create_feature_grouped_bar,
    create_elbow_plot,
    create_silhouette_barchart,
    create_correlation_heatmap,
    create_single_customer_radar
)

# -----------------------------------------------------------------------------
# 🖥️ STYLING & BRAND INJECTIONS (Glass-morphism and custom font theme)
# -----------------------------------------------------------------------------
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
    
    /* Global styling overrides */
    html, body, [data-testid="stAppViewContainer"] {
        background-color: #0A0E1A !important;
        font-family: 'Space Grotesk', sans-serif !important;
        color: #E2E8F0 !important;
    }
    
    /* Sidebar styling overrides */
    [data-testid="stSidebar"] {
        background-color: #0D1224 !important;
        border-right: 1px solid rgba(0, 212, 255, 0.1) !important;
    }
    
    /* Metrics panel styled with premium glass-morphism card look */
    div[data-testid="metric-container"] {
        background: rgba(26, 31, 53, 0.6) !important;
        border: 1px solid rgba(0, 212, 255, 0.15) !important;
        padding: 1.2rem 1.5rem !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        transition: transform 0.2s ease-in-out, border-color 0.2s !important;
    }
    
    div[data-testid="metric-container"]:hover {
        transform: translateY(-2px) !important;
        border-color: rgba(0, 212, 255, 0.4) !important;
    }
    
    /* Correcting indicator color properties for Delta and primary numbers */
    div[data-testid="stMetricValue"] {
        color: #00D4FF !important;
        font-weight: 700 !important;
    }
    
    div[data-testid="stMetricDelta"] svg {
        fill: #00D4FF !important;
    }
    div[data-testid="stMetricDelta"] > div {
        color: #00D4FF !important;
    }
    
    /* Custom tab active indicator customization */
    button[data-baseweb="tab"] {
        font-family: 'Space Grotesk', sans-serif !important;
        color: #8A99AD !important;
        border-bottom-width: 2px !important;
        border-bottom-color: transparent !important;
        transition: color 0.15s, border-color 0.15s !important;
        font-size: 1.1rem !important;
    }
    
    button[data-baseweb="tab"]:active, button[data-baseweb="tab"][aria-selected="true"] {
        color: #00D4FF !important;
        border-bottom-color: #00D4FF !important;
    }
    
    /* Box headers and clean separators */
    h1, h2, h3 {
        color: #FFFFFF !important;
        font-weight: 600 !important;
        tracking: -0.02em !important;
    }
    
    /* Floating action card borders */
    .glass-card {
        background: rgba(26, 31, 53, 0.6);
        border: 1px solid rgba(0, 212, 255, 0.1);
        padding: 1.5rem;
        border-radius: 12px;
        backdrop-filter: blur(8px);
        margin-bottom: 1.5rem;
    }
    
    .accent-cyan {
        color: #00D4FF;
    }
    .accent-gold {
        color: #FFB800;
    }
</style>
""", unsafe_allow_value=True)

# -----------------------------------------------------------------------------
# 📦 DATA CACHING & INITIALIZATION
# -----------------------------------------------------------------------------
@st.cache_data
def get_base_dataset(n=300):
    return generate_customer_data(n_customers=n, seed=42)

@st.cache_data
def get_elbow_benchmark(df):
    return get_elbow_data(df, max_k=10, random_state=42)

# Load base values
raw_df = get_base_dataset()
wcss_vals = get_elbow_benchmark(raw_df)

# -----------------------------------------------------------------------------
# 🎛️ SIDEBAR CONTROL SUITE
# -----------------------------------------------------------------------------
st.sidebar.markdown(
    "<h2 style='text-align: center; color: #FFFFFF;'>🔮 Controls</h2>", 
    unsafe_allow_value=True
)
st.sidebar.markdown("<p style='text-align: center; font-size: 0.9rem; color: #8A99AD;'>Adjust clustering properties on-the-fly</p>", unsafe_allow_value=True)
st.sidebar.markdown("---")

# Sliders and selectors
k_value = st.sidebar.slider(
    "Number of Clusters (k)", 
    min_value=2, 
    max_value=10, 
    value=5, 
    step=1,
    help="Select the number of clusters to group customers. Default is 5."
)

projection_method = st.sidebar.selectbox(
    "2D Projection View",
    options=["PCA", "t-SNE"],
    index=0,
    help="Select dimensionality reduction method for representation."
)

# Render clustering
processed_df, avg_sil, wcss = perform_clustering(raw_df, k=k_value, random_state=42)

# Build dynamic multiselect filtering based on active clusters
available_clusters = sorted(processed_df["cluster_name"].unique())
cluster_selection = st.sidebar.multiselect(
    "Filter Visible Segments",
    options=available_clusters,
    default=available_clusters,
    help="Toggle segment visibility to analyze specific profiles."
)

# Filter dataframe based on selections
filtered_df = processed_df[processed_df["cluster_name"].isin(cluster_selection)].copy()

# Simple theme switcher logic
color_theme = st.sidebar.radio(
    "Color Design Preset",
    options=["Dark Fusion (Default)", "Light Radiant Mode"],
    index=0
)

# App footer in sidebar
st.sidebar.markdown("---")
st.sidebar.markdown(
    """
    <div style='text-align: center; font-size: 0.8rem; color: #4A5D78;'>
        Bank Customer Segmentation Suite v1.1.0<br/>
        Optimized via SciPy & Streamlit
    </div>
    """, 
    unsafe_allow_value=True
)

# -----------------------------------------------------------------------------
# 📑 CORE PRESENTATION BODY
# -----------------------------------------------------------------------------
st.markdown("<h1 style='margin-bottom: 0.2rem;'>🔮 Bank Customer Segmentation Dashboard</h1>", unsafe_allow_value=True)
st.markdown("<p style='font-size: 1.1rem; color: #8A99AD; margin-bottom: 1.5rem;'>An advanced machine learning control center powered by real-time K-Means clustering and high-dimensional projections.</p>", unsafe_allow_value=True)

# Initialize Streamlit Tab Structure
tab_overview, tab_profiles, tab_evaluation, tab_explorer = st.tabs([
    "📈 Overview", 
    "👥 Cluster Profiles", 
    "🧪 Model Evaluation", 
    "🔍 Customer Explorer"
])

# -----------------------------------------------------------------------------
# TAB 1: OVERVIEW PANEL
# -----------------------------------------------------------------------------
with tab_overview:
    # Diagnostic metric cards
    col_1, col_2, col_3, col_4 = st.columns(4)
    
    with col_1:
        st.metric(
            label="Total Customers Profiled", 
            value=len(filtered_df),
            delta=None
        )
        
    with col_2:
        st.metric(
            label="Active Clusters (k)", 
            value=f"{k_value} Active",
            delta=None
        )
        
    with col_3:
        st.metric(
            label="Cohesion Score (Avg Silhouette)", 
            value=f"{avg_sil:.3f}",
            delta=None
        )
        
    with col_4:
        # Determine the size and name of the largest cluster
        if not filtered_df.empty:
            largest_size = filtered_df["cluster_name"].value_counts().max()
            largest_name = filtered_df["cluster_name"].value_counts().idxmax()
            st.metric(
                label="Dominant Segment", 
                value=f"{largest_size} accounts",
                delta=f"{largest_name}"
            )
        else:
            st.metric(
                label="Dominant Segment", 
                value="N/A",
                delta=None
            )
            
    st.markdown("<br/>", unsafe_allow_value=True)
    
    if filtered_df.empty:
        st.warning("⚠️ No clusters selected. Please check at least one cluster in the sidebar to view metrics.")
    else:
        # Visualization columns
        fig_cols_left, fig_cols_right = st.columns([1.6, 1.0])
        
        with fig_cols_left:
            # 2D PCA/t-SNE Scatter plot
            scatter_fig = create_2d_projection_scatter(filtered_df, method=projection_method)
            st.plotly_chart(scatter_fig, use_container_width=True)
            
        with fig_cols_right:
            # Donut distribution chart
            pie_fig = create_cluster_dist_pie(filtered_df)
            st.plotly_chart(pie_fig, use_container_width=True)

# -----------------------------------------------------------------------------
# TAB 2: CLUSTER PROFILES PANEL
# -----------------------------------------------------------------------------
with tab_profiles:
    if filtered_df.empty:
        st.warning("⚠️ No clusters selected. Please check at least one cluster in the sidebar to view profiles.")
    else:
        profile_cols_left, profile_cols_right = st.columns([1.2, 1.0])
        
        with profile_cols_left:
            # Multi-trace radar chart overlay
            radar_fig = create_radar_profiles(filtered_df)
            st.plotly_chart(radar_fig, use_container_width=True)
            
        with profile_cols_right:
            # Grouped bar chart with interactive feature selector
            feature_options = [
                ("annual_income", "Annual Income"),
                ("account_balance", "Account Balance"),
                ("spending_score", "Spending Score"),
                ("credit_score", "Credit Score"),
                ("age", "Age"),
                ("num_products", "Number of Products"),
                ("tenure_years", "Tenure Years")
            ]
            chosen_label = st.selectbox(
                "Select Profile Metric to Contrast:",
                options=[opt[1] for opt in feature_options],
                index=0
            )
            # Find key from label
            chosen_key = [opt[0] for opt in feature_options if opt[1] == chosen_label][0]
            
            # Grouped bar chart trigger
            bar_fig = create_feature_grouped_bar(filtered_df, chosen_key)
            st.plotly_chart(bar_fig, use_container_width=True)
            
        st.markdown("<h3 style='margin-top: 1rem;'>📊 Segment Summary Statistics</h3>", unsafe_allow_value=True)
        st.markdown("<p style='font-size: 0.9rem; color: #8A99AD;'>Contrast cluster metrics (mean ± standard deviation) to guide targeting choices.</p>", unsafe_allow_value=True)
        
        # Calculate concise stats summary table
        summ_features = ["age", "annual_income", "spending_score", "credit_score", "account_balance", "num_products"]
        stats_data = []
        
        for cluster_name in sorted(filtered_df["cluster_name"].unique()):
            sub = filtered_df[filtered_df["cluster_name"] == cluster_name]
            stats_row = {"Segment": cluster_name, "Size": len(sub)}
            for feat in summ_features:
                mean_val = sub[feat].mean()
                std_val = sub[feat].std()
                
                if feat in ["annual_income", "account_balance"]:
                    stats_row[feat.replace("_", " ").title()] = f"${mean_val:,.0f} (±${std_val:,.0f})"
                elif feat in ["spending_score", "credit_score"]:
                    stats_row[feat.replace("_", " ").title()] = f"{mean_val:.1f} (±{std_val:.1f})"
                else:
                    stats_row[feat.replace("_", " ").title()] = f"{mean_val:.1f} (±{std_val:.1f})"
            stats_data.append(stats_row)
            
        stats_df = pd.DataFrame(stats_data).set_index("Segment")
        
        # Styled pandas display
        st.dataframe(
            stats_df.style.set_properties(**{
                'background-color': '#111528',
                'border-color': 'rgba(0, 212, 255, 0.1)',
                'color': '#E2E8F0'
            }),
            use_container_width=True
        )

# -----------------------------------------------------------------------------
# TAB 3: MODEL EVALUATION PANEL
# -----------------------------------------------------------------------------
with tab_evaluation:
    eval_cols_left, eval_cols_right = st.columns(2)
    
    with eval_cols_left:
        # Elbow plot
        elbow_fig = create_elbow_plot(wcss_vals, k_value)
        st.plotly_chart(elbow_fig, use_container_width=True)
        st.markdown("""
            **Understanding the Elbow Plot:**
            The inertia (WCSS) quantifies how tightly grouped points are. At the ideal cluster value ($k$), adding more clusters yields diminishing returns. This appears as an **"elbow"** inflection point.
        """)
        
    with eval_cols_right:
        # Silhouette bar chart
        sil_fig = create_silhouette_barchart(filtered_df)
        st.plotly_chart(sil_fig, use_container_width=True)
        st.markdown("""
            **Evaluating Silhouette Score:**
            Measures how similar a customer is to their own cluster compared to neighboring clusters.
            *   **> 0.5 (Green)**: Strong structure identified.
            *   **0.3 – 0.5 (Yellow)**: Solid logical clustering.
            *   **< 0.3 (Red)**: Overlapping/ambiguous boundaries.
        """)
        
    st.markdown("---")
    # Linear correlation heathen
    st.plotly_chart(create_correlation_heatmap(raw_df), use_container_width=True)

# -----------------------------------------------------------------------------
# TAB 4: CUSTOMER EXPLORER PANEL
# -----------------------------------------------------------------------------
with tab_explorer:
    st.markdown("<h3>🔍 Dynamic Customer Query Console</h3>", unsafe_allow_value=True)
    st.markdown("<p style='font-size: 0.9rem; color: #8A99AD; margin-bottom: 1.5rem;'>Filter accounts instantly using the search queries, then select any record to analyze their comparative individual segment footprint.</p>", unsafe_allow_value=True)
    
    col_search, col_seg_filter = st.columns([2, 1])
    with col_search:
        search_query = st.text_input("Search Customer ID (e.g. 10001)", value="", placeholder="Type customer index...")
    with col_seg_filter:
        seg_quick_filter = st.selectbox("Quick Segment Isolation Filter", ["All Selected"] + list(filtered_df["cluster_name"].unique()))
        
    # Apply filtering logic based on input query
    exp_df = filtered_df.copy()
    if seg_quick_filter != "All Selected":
        exp_df = exp_df[exp_df["cluster_name"] == seg_quick_filter]
    if search_query.strip():
        exp_df = exp_df[exp_df["customer_id"].astype(str).str.contains(search_query.strip())]
        
    # Styled table display helper with pandas styler mapping color accents
    def style_rows(row):
        # Apply light gradient matching cluster indexes
        colors = ['#16233b', '#2e2518', '#1c281e', '#291c28', '#1c282d', '#252118']
        color_idx = int(row['cluster']) % len(colors)
        return [f'background-color: {colors[color_idx]}; border-bottom: 1px solid rgba(255,255,255,0.05); color: #FFF;'] * len(row)
        
    if exp_df.empty:
        st.info("No matching accounts found for the current query constraints.")
    else:
        # Display the interactive dataframe selector
        col_list_left, col_list_right = st.columns([1.5, 1.0])
        
        with col_list_left:
            st.markdown("##### 📁 Customer Records (Click record below or type search ID to inspect details)")
            st.dataframe(
                exp_df[["customer_id", "cluster_name", "annual_income", "account_balance", "spending_score", "credit_score", "age", "num_products", "tenure_years", "cluster"]].style.apply(style_rows, axis=1),
                use_container_width=True,
                height=420
            )
            
        with col_list_right:
            st.markdown("##### 👤 Segment Blueprint Detail Inspector")
            
            # Select target row index logically: first row of table by default, or specific queried choice
            target_account = exp_df.iloc[0]
            
            # Display target card in beautiful glass-morphism container
            st.markdown(
                f"""
                <div class="glass-card">
                    <h4 style="margin:0; color:{ACCENT_CYAN};">Customer ID: #{target_account['customer_id']}</h4>
                    <p style="margin:5px 0 10px 0; font-size:1.1rem; font-weight:600;">Segment Name: <span style="color:#FFF;">{target_account['cluster_name']}</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0;"/>
                    <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
                        <tr><td style="padding:4px 0; color:#8A99AD;">Annual Income:</td><td style="text-align:right; font-weight:600;">${target_account['annual_income']:,.0f}</td></tr>
                        <tr><td style="padding:4px 0; color:#8A99AD;">Account Balance:</td><td style="text-align:right; font-weight:600;">${target_account['account_balance']:,.0f}</td></tr>
                        <tr><td style="padding:4px 0; color:#8A99AD;">Credit Score:</td><td style="text-align:right; font-weight:600;">{target_account['credit_score']}</td></tr>
                        <tr><td style="padding:4px 0; color:#8A99AD;">Spending Score:</td><td style="text-align:right; font-weight:600;">{target_account['spending_score']}/100</td></tr>
                        <tr><td style="padding:4px 0; color:#8A99AD;">Age:</td><td style="text-align:right; font-weight:600;">{target_account['age']} years</td></tr>
                        <tr><td style="padding:4px 0; color:#8A99AD;">Products Subscribed:</td><td style="text-align:right; font-weight:600;">{target_account['num_products']}</td></tr>
                        <tr><td style="padding:4px 0; color:#8A99AD;">Tenure:</td><td style="text-align:right; font-weight:600;">{target_account['tenure_years']} years</td></tr>
                    </table>
                </div>
                """, 
                unsafe_allow_value=True
            )
            
            # Mini-radar showing detailed individual profile overlay vs segment averages
            cluster_avg = raw_df[raw_df["customer_id"].isin(filtered_df[filtered_df["cluster_name"] == target_account["cluster_name"]]["customer_id"])].mean(numeric_only=True)
            all_min = raw_df.min(numeric_only=True)
            all_max = raw_df.max(numeric_only=True)
            
            single_radar = create_single_customer_radar(target_account, cluster_avg, all_min, all_max)
            st.plotly_chart(single_radar, use_container_width=True)
