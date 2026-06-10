import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.metrics import silhouette_score, silhouette_samples

def perform_clustering(df: pd.DataFrame, k: int = 5, random_state: int = 42):
    """
    Performs scaling, K-Means clustering, PCA/t-SNE dimensionality reduction,
    and returns a clean, labeled DataFrame with metrics.
    """
    # Exclude ID column for modeling
    features = ["age", "annual_income", "spending_score", "credit_score", "account_balance", "num_products", "tenure_years"]
    X = df[features].copy()
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # K-Means model
    kmeans = KMeans(n_clusters=k, random_state=random_state, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    
    # Project with PCA
    pca = PCA(n_components=2, random_state=random_state)
    X_pca = pca.fit_transform(X_scaled)
    
    # Project with t-SNE (use perplexity suited for dataset size)
    perplexity = min(30, max(5, int(len(df) / 10)))
    tsne = TSNE(n_components=2, perplexity=perplexity, random_state=random_state, init='pca', learning_rate='auto')
    X_tsne = tsne.fit_transform(X_scaled)
    
    # Silhouette Metrics
    avg_sil_score = silhouette_score(X_scaled, cluster_labels)
    sil_vals = silhouette_samples(X_scaled, cluster_labels)
    
    # Create copy of dataframe to append outputs safely
    out_df = df.copy()
    out_df["cluster"] = cluster_labels
    out_df["pca_1"] = X_pca[:, 0]
    out_df["pca_2"] = X_pca[:, 1]
    out_df["tsne_1"] = X_tsne[:, 0]
    out_df["tsne_2"] = X_tsne[:, 1]
    out_df["silhouette_score"] = sil_vals
    
    # Readable Labels for k = 5
    # If k = 5, assign names according to user prompt. To handle random centroid shifting, 
    # we can map centroids to their corresponding segment qualities (e.g. Wealthy is highest income/balance, etc.)
    # or simple numeric mapping as specified:
    # 0 -> "Young Actives", 1 -> "Wealthy Savers", 2 -> "Mass Market", 3 -> "Senior Premium", 4 -> "At-Risk"
    label_mapping = {}
    if k == 5:
        # We can map the clusters based on their characteristics so the labels match their true characteristics:
        # Find mean balance and income for each cluster
        cluster_means = out_df.groupby("cluster")[["annual_income", "account_balance", "age", "spending_score", "credit_score"]].mean()
        
        # 1. "Senior Premium": oldest average age OR very high balance and high age
        senior_premium_idx = cluster_means["age"].idxmax()
        
        # 2. "Wealthy Savers" (not senior premium, highest remaining balance)
        rem = cluster_means.drop(senior_premium_idx, errors='ignore')
        wealthy_savers_idx = rem["account_balance"].idxmax()
        
        # 3. "Young Actives" (youngest age group)
        rem = rem.drop(wealthy_savers_idx, errors='ignore')
        young_actives_idx = rem["age"].idxmin()
        
        # 4. "At-Risk" (lowest credit score or lowest income)
        rem = rem.drop(young_actives_idx, errors='ignore')
        at_risk_idx = rem["credit_score"].idxmin()
        
        # 5. "Mass Market" (the remaining physical cluster)
        rem = rem.drop(at_risk_idx, errors='ignore')
        mass_market_idx = rem.index[0] if len(rem.index) > 0 else 0
        
        label_mapping = {
            young_actives_idx: "Young Actives",
            wealthy_savers_idx: "Wealthy Savers",
            mass_market_idx: "Mass Market",
            senior_premium_idx: "Senior Premium",
            at_risk_idx: "At-Risk"
        }
    else:
        # Fallback names for other values of k
        cluster_means = out_df.groupby("cluster")["account_balance"].mean().sort_values(ascending=False)
        for rank, cluster_idx in enumerate(cluster_means.index):
            if rank == 0:
                label_mapping[cluster_idx] = f"Premium Tier ({cluster_idx})"
            elif rank == len(cluster_means) - 1:
                label_mapping[cluster_idx] = f"Basic Saver ({cluster_idx})"
            else:
                label_mapping[cluster_idx] = f"Core Sector {rank} ({cluster_idx})"
                
    out_df["cluster_name"] = out_df["cluster"].map(label_mapping)
    
    return out_df, avg_sil_score, kmeans.inertia_

def get_elbow_data(df: pd.DataFrame, max_k: int = 10, random_state: int = 42):
    """
    Computes WCSS values for k = 1 to max_k to use in the elbow plot.
    """
    features = ["age", "annual_income", "spending_score", "credit_score", "account_balance", "num_products", "tenure_years"]
    X = df[features].copy()
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    wcss = []
    for i in range(1, max_k + 1):
        kmeans = KMeans(n_clusters=i, random_state=random_state, n_init=10)
        kmeans.fit(X_scaled)
        wcss.append(kmeans.inertia_)
        
    return wcss
