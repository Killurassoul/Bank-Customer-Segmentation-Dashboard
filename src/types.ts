export interface Customer {
  customer_id: number;
  age: number;
  annual_income: number;
  spending_score: number;
  credit_score: number;
  account_balance: number;
  num_products: number;
  tenure_years: number;
  
  // Appended modeled fields
  cluster: number;
  cluster_name: string;
  pca_1: number;
  pca_2: number;
  tsne_1: number;
  tsne_2: number;
  silhouette_score: number;
}

export type ProjectionMethod = 'PCA' | 't-SNE';

export interface ClusterSummary {
  cluster: number;
  cluster_name: string;
  size: number;
  avg_age: number;
  avg_income: number;
  avg_spending: number;
  avg_credit: number;
  avg_balance: number;
  avg_products: number;
  avg_tenure: number;
  avg_silhouette: number;
  color: string;
}
