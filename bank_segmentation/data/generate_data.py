import numpy as np
import pandas as pd

def generate_customer_data(n_customers: int = 300, seed: int = 42) -> pd.DataFrame:
    """
    Generates a realistic synthetic dataset for bank customer segmentation.
    Includes natural grouping to ensure clustering algorithms perform meaningfully.
    """
    np.random.seed(seed)
    
    # Target segments to generate realistic cohesion:
    # 0. Young Actives: Young age, low/middle income, high spending, middle balance, low tenure
    # 1. Wealthy Savers: Middle-aged, high income, low spending, high balance, high credit
    # 2. Mass Market: Varied age, moderate income, moderate spending, moderate balance, moderate credit
    # 3. Senior Premium: High age, high income, moderate spending, very high balance, high credit, high tenure
    # 4. At-Risk: Moderate age, low income, low spending, very low balance, low credit, low tenure
    
    customers = []
    
    # Determine cluster allocation: roughly equal shares
    segment_shares = [0.18, 0.22, 0.30, 0.15, 0.15]
    segment_counts = [int(n_customers * share) for share in segment_shares]
    # Adjust last count to exactly sum to n_customers
    segment_counts[-1] += n_customers - sum(segment_counts)
    
    for seg_idx, count in enumerate(segment_counts):
        for _ in range(count):
            cust_id = len(customers) + 10001
            
            if seg_idx == 0:  # Young Actives
                age = int(np.random.normal(26, 4))
                annual_income = int(np.random.normal(45000, 10000))
                spending_score = int(np.random.normal(78, 10))
                credit_score = int(np.random.normal(620, 50))
                account_balance = int(np.random.normal(25000, 10000))
                num_products = int(np.random.choice([1, 2], p=[0.7, 0.3]))
                tenure_years = int(np.random.uniform(1, 4))
                
            elif seg_idx == 1:  # Wealthy Savers
                age = int(np.random.normal(42, 8))
                annual_income = int(np.random.normal(145000, 20000))
                spending_score = int(np.random.normal(25, 8))
                credit_score = int(np.random.normal(740, 40))
                account_balance = int(np.random.normal(320000, 50000))
                num_products = int(np.random.choice([2, 3, 4], p=[0.2, 0.5, 0.3]))
                tenure_years = int(np.random.normal(11, 3))
                
            elif seg_idx == 2:  # Mass Market
                age = int(np.random.normal(35, 10))
                annual_income = int(np.random.normal(65000, 15000))
                spending_score = int(np.random.normal(48, 12))
                credit_score = int(np.random.normal(650, 60))
                account_balance = int(np.random.normal(85000, 25000))
                num_products = int(np.random.choice([1, 2, 3], p=[0.4, 0.4, 0.2]))
                tenure_years = int(np.random.normal(6, 3))
                
            elif seg_idx == 3:  # Senior Premium
                age = int(np.random.normal(64, 5))
                annual_income = int(np.random.normal(120000, 25000))
                spending_score = int(np.random.normal(45, 15))
                credit_score = int(np.random.normal(760, 35))
                account_balance = int(np.random.normal(410000, 45000))
                num_products = int(np.random.choice([3, 4, 5], p=[0.3, 0.5, 0.2]))
                tenure_years = int(np.random.normal(14, 3))
                
            else:  # At-Risk
                age = int(np.random.normal(39, 9))
                annual_income = int(np.random.normal(22000, 5000))
                spending_score = int(np.random.normal(15, 8))
                credit_score = int(np.random.normal(480, 70))
                account_balance = int(np.random.normal(4000, 3000))
                num_products = int(np.random.choice([1, 2], p=[0.8, 0.2]))
                tenure_years = int(np.random.uniform(0, 3))
                
            # Clip values to ensure they stay strictly within specified boundaries
            age = int(np.clip(age, 18, 75))
            annual_income = int(np.clip(annual_income, 15000, 200000))
            spending_score = int(np.clip(spending_score, 1, 100))
            credit_score = int(np.clip(credit_score, 300, 850))
            account_balance = int(np.clip(account_balance, 0, 500000))
            num_products = int(np.clip(num_products, 1, 5))
            tenure_years = int(np.clip(tenure_years, 0, 20))
            
            customers.append({
                "customer_id": cust_id,
                "age": age,
                "annual_income": annual_income,
                "spending_score": spending_score,
                "credit_score": credit_score,
                "account_balance": account_balance,
                "num_products": num_products,
                "tenure_years": tenure_years
            })
            
    df = pd.DataFrame(customers)
    # Shuffle the dataset to mix the pre-defined groups
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df
