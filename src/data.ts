import { Customer } from './types';

// Deterministic seedable LCG random generator
export function createRandom(seed: number) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Normal Distribution Generator using Box-Muller transform
export function randomNormal(rng: () => number, mean: number, stdDev: number): number {
  let u1 = rng();
  let u2 = rng();
  
  // Guard values against zero to prevent logarithmic infinity issues
  if (u1 <= 0.0) u1 = 0.0001;
  if (u2 <= 0.0) u2 = 0.0001;
  
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

// Helper to choose item from options based on deterministic probability
function choice<T>(rng: () => number, options: T[], weights: number[]): T {
  const r = rng();
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (r <= sum) {
      return options[i];
    }
  }
  return options[options.length - 1];
}

export function generateCustomerData(n_customers: number = 300, seed: number = 42): Customer[] {
  const rng = createRandom(seed);
  
  const segmentShares = [0.18, 0.22, 0.30, 0.15, 0.15];
  const segmentCounts = segmentShares.map(share => Math.floor(n_customers * share));
  segmentCounts[segmentCounts.length - 1] += n_customers - segmentCounts.reduce((a, b) => a + b, 0);
  
  const customers: Omit<Customer, 'cluster' | 'cluster_name' | 'pca_1' | 'pca_2' | 'tsne_1' | 'tsne_2' | 'silhouette_score'>[] = [];
  
  for (let segIdx = 0; segIdx < segmentCounts.length; segIdx++) {
    const count = segmentCounts[segIdx];
    for (let i = 0; i < count; i++) {
      const custId = 10001 + customers.length;
      
      let age = 30;
      let annualIncome = 50000;
      let spendingScore = 50;
      let creditScore = 600;
      let accountBalance = 50000;
      let numProducts = 2;
      let tenureYears = 5;
      
      if (segIdx === 0) { // Young Actives
        age = Math.round(randomNormal(rng, 26, 4));
        annualIncome = Math.round(randomNormal(rng, 45000, 10000));
        spendingScore = Math.round(randomNormal(rng, 78, 10));
        creditScore = Math.round(randomNormal(rng, 620, 50));
        accountBalance = Math.round(randomNormal(rng, 25000, 10000));
        numProducts = choice(rng, [1, 2], [0.7, 0.3]);
        tenureYears = Math.round(rng() * 3 + 1); // 1-4
        
      } else if (segIdx === 1) { // Wealthy Savers
        age = Math.round(randomNormal(rng, 42, 8));
        annualIncome = Math.round(randomNormal(rng, 145000, 20000));
        spendingScore = Math.round(randomNormal(rng, 25, 8));
        creditScore = Math.round(randomNormal(rng, 740, 40));
        accountBalance = Math.round(randomNormal(rng, 320000, 50000));
        numProducts = choice(rng, [2, 3, 4], [0.2, 0.5, 0.3]);
        tenureYears = Math.round(randomNormal(rng, 11, 3));
        
      } else if (segIdx === 2) { // Mass Market
         age = Math.round(randomNormal(rng, 35, 10));
         annualIncome = Math.round(randomNormal(rng, 65000, 15000));
         spendingScore = Math.round(randomNormal(rng, 48, 12));
         creditScore = Math.round(randomNormal(rng, 650, 60));
         accountBalance = Math.round(randomNormal(rng, 85000, 25000));
         numProducts = choice(rng, [1, 2, 3], [0.4, 0.4, 0.2]);
         tenureYears = Math.round(randomNormal(rng, 6, 3));
         
      } else if (segIdx === 3) { // Senior Premium
         age = Math.round(randomNormal(rng, 64, 5));
         annualIncome = Math.round(randomNormal(rng, 120000, 25000));
         spendingScore = Math.round(randomNormal(rng, 45, 15));
         creditScore = Math.round(randomNormal(rng, 760, 35));
         accountBalance = Math.round(randomNormal(rng, 410000, 45000));
         numProducts = choice(rng, [3, 4, 5], [0.3, 0.5, 0.2]);
         tenureYears = Math.round(randomNormal(rng, 14, 3));
         
      } else { // At-Risk
         age = Math.round(randomNormal(rng, 39, 9));
         annualIncome = Math.round(randomNormal(rng, 22000, 5000));
         spendingScore = Math.round(randomNormal(rng, 15, 8));
         creditScore = Math.round(randomNormal(rng, 480, 70));
         accountBalance = Math.round(randomNormal(rng, 4000, 3000));
         numProducts = choice(rng, [1, 2], [0.8, 0.2]);
         tenureYears = Math.round(rng() * 3); // 0-3
      }
      
      // Enforce strict boundary checks
      age = Math.max(18, Math.min(75, age));
      annualIncome = Math.max(15000, Math.min(200000, annualIncome));
      spendingScore = Math.max(1, Math.min(100, spendingScore));
      creditScore = Math.max(300, Math.min(850, creditScore));
      accountBalance = Math.max(0, Math.min(500000, accountBalance));
      numProducts = Math.max(1, Math.min(5, numProducts));
      tenureYears = Math.max(0, Math.min(20, tenureYears));
      
      customers.push({
        customer_id: custId,
        age,
        annual_income: annualIncome,
        spending_score: spendingScore,
        credit_score: creditScore,
        account_balance: accountBalance,
        num_products: numProducts,
        tenure_years: tenureYears
      });
    }
  }
  
  // Standard list shuffle to randomize input sequence slightly
  const shuffled = [...customers];
  const deckRng = createRandom(123);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(deckRng() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  
  // Return typed base objects
  return shuffled.map(c => ({
    ...c,
    cluster: 0,
    cluster_name: '',
    pca_1: 0,
    pca_2: 0,
    tsne_1: 0,
    tsne_2: 0,
    silhouette_score: 0
  }));
}
