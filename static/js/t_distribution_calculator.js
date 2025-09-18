class TDistributionCalculator {
    constructor() {
        this.chart = null;
        this.currentDF = 5;
        this.showNormal = true;
        
        this.initializeEventListeners();
        this.initializeChart();
        this.updateDistribution();
    }
    
    initializeEventListeners() {
        // 自由度变化
        document.getElementById('degreesOfFreedom').addEventListener('input', (e) => {
            this.currentDF = parseInt(e.target.value);
            this.updateDistribution();
        });
        
        // 显示正态分布切换
        document.getElementById('showNormal').addEventListener('change', (e) => {
            this.showNormal = e.target.checked;
            this.updateChart();
        });
        
        // CDF计算
        document.getElementById('calculateCDF').addEventListener('click', () => {
            this.calculateCDF();
        });
        
        // 分位数计算
        document.getElementById('calculateQuantile').addEventListener('click', () => {
            this.calculateQuantile();
        });
        
        // 输入框回车事件
        document.getElementById('cdfInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateCDF();
        });
        
        document.getElementById('quantileInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateQuantile();
        });
    }
    
    // Gamma函数近似计算（Lanczos近似）
    gamma(z) {
        const g = 7;
        const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
                  771.32342877765313, -176.61502916214059, 12.507343278686905,
                  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
        
        if (z < 0.5) {
            return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
        }
        
        z -= 1;
        let x = C[0];
        for (let i = 1; i < g + 2; i++) {
            x += C[i] / (z + i);
        }
        
        const t = z + g + 0.5;
        const sqrt2pi = Math.sqrt(2 * Math.PI);
        
        return sqrt2pi * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }
    
    // Beta函数
    beta(a, b) {
        return this.gamma(a) * this.gamma(b) / this.gamma(a + b);
    }
    
    // t分布概率密度函数
    tPDF(x, df) {
        const numerator = this.gamma((df + 1) / 2);
        const denominator = Math.sqrt(df * Math.PI) * this.gamma(df / 2);
        const factor = numerator / denominator;
        return factor * Math.pow(1 + (x * x) / df, -(df + 1) / 2);
    }
    
    // 标准正态分布概率密度函数
    normalPDF(x) {
        return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
    }
    
    // 不完全Beta函数（用于t分布CDF计算）
    incompleteBeta(x, a, b) {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        
        // 使用连分数展开近似计算
        const bt = Math.exp(this.logGamma(a + b) - this.logGamma(a) - this.logGamma(b) + 
                           a * Math.log(x) + b * Math.log(1 - x));
        
        if (x < (a + 1) / (a + b + 2)) {
            return bt * this.betaCF(x, a, b) / a;
        } else {
            return 1 - bt * this.betaCF(1 - x, b, a) / b;
        }
    }
    
    // 对数Gamma函数
    logGamma(z) {
        const g = 7;
        const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
                  771.32342877765313, -176.61502916214059, 12.507343278686905,
                  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
        
        if (z < 0.5) {
            return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - this.logGamma(1 - z);
        }
        
        z -= 1;
        let x = C[0];
        for (let i = 1; i < g + 2; i++) {
            x += C[i] / (z + i);
        }
        
        const t = z + g + 0.5;
        return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
    }
    
    // Beta函数连分数展开
    betaCF(x, a, b) {
        const maxIterations = 100;
        const epsilon = 3e-7;
        
        const qab = a + b;
        const qap = a + 1;
        const qam = a - 1;
        let c = 1;
        let d = 1 - qab * x / qap;
        
        if (Math.abs(d) < 1e-30) d = 1e-30;
        d = 1 / d;
        let h = d;
        
        for (let m = 1; m <= maxIterations; m++) {
            const m2 = 2 * m;
            let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
            d = 1 + aa * d;
            if (Math.abs(d) < 1e-30) d = 1e-30;
            c = 1 + aa / c;
            if (Math.abs(c) < 1e-30) c = 1e-30;
            d = 1 / d;
            h *= d * c;
            
            aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
            d = 1 + aa * d;
            if (Math.abs(d) < 1e-30) d = 1e-30;
            c = 1 + aa / c;
            if (Math.abs(c) < 1e-30) c = 1e-30;
            d = 1 / d;
            const del = d * c;
            h *= del;
            
            if (Math.abs(del - 1) < epsilon) break;
        }
        
        return h;
    }
    
    // t分布累积分布函数
    tCDF(x, df) {
        if (x === 0) return 0.5;
        
        const t = df / (df + x * x);
        const result = 0.5 * this.incompleteBeta(t, df / 2, 0.5);
        
        return x > 0 ? 1 - result : result;
    }
    
    // 标准正态分布累积分布函数（近似）
    normalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }
    
    // 误差函数近似
    erf(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    }
    
    // t分布分位数函数（牛顿-拉夫逊方法）
    tQuantile(p, df) {
        if (p <= 0) return -Infinity;
        if (p >= 1) return Infinity;
        if (p === 0.5) return 0;
        
        // 初始估计值
        let x = this.normalQuantile(p);
        
        // 牛顿-拉夫逊迭代
        for (let i = 0; i < 20; i++) {
            const fx = this.tCDF(x, df) - p;
            const fpx = this.tPDF(x, df);
            
            if (Math.abs(fx) < 1e-10) break;
            if (fpx === 0) break;
            
            x = x - fx / fpx;
        }
        
        return x;
    }
    
    // 标准正态分布分位数函数（近似）
    normalQuantile(p) {
        if (p <= 0) return -Infinity;
        if (p >= 1) return Infinity;
        if (p === 0.5) return 0;
        
        // Beasley-Springer-Moro算法
        const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 
                  1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
        const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 
                  6.680131188771972e+01, -1.328068155288572e+01];
        const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, 
                  -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
        const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 
                  3.754408661907416e+00];
        
        const pLow = 0.02425;
        const pHigh = 1 - pLow;
        
        let q, r, x;
        
        if (p < pLow) {
            q = Math.sqrt(-2 * Math.log(p));
            x = (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / 
                ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
        } else if (p <= pHigh) {
            q = p - 0.5;
            r = q * q;
            x = (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q / 
                (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
        } else {
            q = Math.sqrt(-2 * Math.log(1 - p));
            x = -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / 
                 ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
        }
        
        return x;
    }
    
    initializeChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: -4,
                        max: 4,
                        title: {
                            display: true,
                            text: 't值'
                        },
                        grid: {
                            color: '#e0e0e0'
                        }
                    },
                    y: {
                        min: 0,
                        max: 0.5,
                        title: {
                            display: true,
                            text: '概率密度'
                        },
                        grid: {
                            color: '#e0e0e0'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: f(${context.parsed.x.toFixed(2)}) = ${context.parsed.y.toFixed(4)}`;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    updateDistribution() {
        this.updateDistributionInfo();
        this.updateChart();
        this.updateCriticalValues();
        this.calculateCDF();
        this.calculateQuantile();
    }
    
    updateDistributionInfo() {
        const df = this.currentDF;
        let variance = 'undefined';
        
        if (df > 2) {
            variance = (df / (df - 2)).toFixed(4);
        } else if (df > 1) {
            variance = '∞';
        }
        
        document.getElementById('currentVariance').innerHTML = `<strong>当前方差:</strong> ${variance}`;
    }
    
    updateChart() {
        const xValues = [];
        const tValues = [];
        
        // 生成x值和t分布值
        for (let x = -4; x <= 4; x += 0.1) {
            xValues.push(x);
            tValues.push(this.tPDF(x, this.currentDF));
        }
        
        // 更新t分布数据集
        const tDataset = {
            label: `t分布 (df=${this.currentDF})`,
            data: xValues.map((x, i) => ({x: x, y: tValues[i]})),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 4
        };
        
        // 检查是否已存在标准正态分布数据集
        let normalDatasetIndex = -1;
        for (let i = 0; i < this.chart.data.datasets.length; i++) {
            if (this.chart.data.datasets[i].label === '标准正态分布') {
                normalDatasetIndex = i;
                break;
            }
        }
        
        if (this.showNormal) {
            // 如果需要显示标准正态分布且不存在，则创建
            if (normalDatasetIndex === -1) {
                const normalValues = [];
                for (let x = -4; x <= 4; x += 0.1) {
                    normalValues.push(this.normalPDF(x));
                }
                
                const normalDataset = {
                    label: '标准正态分布',
                    data: xValues.map((x, i) => ({x: x, y: normalValues[i]})),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderDash: [5, 5]
                };
                
                this.chart.data.datasets = [tDataset, normalDataset];
            } else {
                // 如果已存在标准正态分布，只更新t分布数据集
                this.chart.data.datasets[0] = tDataset;
            }
        } else {
            // 如果不需要显示标准正态分布，只保留t分布
            this.chart.data.datasets = [tDataset];
        }
        
        this.chart.update('none'); // 使用'none'模式避免动画，提高性能
    }
    
    calculateCDF() {
        const tValue = parseFloat(document.getElementById('cdfInput').value);
        if (isNaN(tValue)) return;
        
        const cdf = this.tCDF(tValue, this.currentDF);
        document.getElementById('cdfResult').textContent = 
            `P(T ≤ ${tValue.toFixed(3)}) = ${cdf.toFixed(6)}`;
    }
    
    calculateQuantile() {
        const p = parseFloat(document.getElementById('quantileInput').value);
        if (isNaN(p) || p <= 0 || p >= 1) return;
        
        const quantile = this.tQuantile(p, this.currentDF);
        const subscript = p.toString().replace('0.', '₀.').replace(/(\d)/g, (match) => {
            const subscripts = '₀₁₂₃₄₅₆₇₈₉';
            return subscripts[parseInt(match)];
        });
        
        document.getElementById('quantileResult').textContent = 
            `t${subscript} = ${quantile.toFixed(4)}`;
    }
    
    updateCriticalValues() {
        const alphas = [0.10, 0.05, 0.01, 0.001];
        const ids = ['critical_010', 'critical_005', 'critical_001', 'critical_0001'];
        
        alphas.forEach((alpha, i) => {
            const criticalValue = this.tQuantile(1 - alpha/2, this.currentDF);
            document.getElementById(ids[i]).textContent = `±${criticalValue.toFixed(4)}`;
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new TDistributionCalculator();
});