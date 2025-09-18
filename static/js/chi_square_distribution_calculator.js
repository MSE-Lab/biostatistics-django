class ChiSquareDistributionCalculator {
    constructor() {
        this.chart = null;
        this.currentDF = 5;
        
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
        
        // 快速选择自由度按钮
        document.querySelectorAll('.df-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const df = parseInt(e.target.dataset.df);
                this.currentDF = df;
                document.getElementById('degreesOfFreedom').value = df;
                this.updateDistribution();
            });
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
    
    // χ²分布概率密度函数
    chiSquarePDF(x, df) {
        if (x <= 0) return 0;
        
        const logPdf = (df / 2 - 1) * Math.log(x) - x / 2 - df / 2 * Math.log(2) - this.logGamma(df / 2);
        return Math.exp(logPdf);
    }
    
    // 不完全Gamma函数（用于χ²分布CDF计算）
    incompleteGamma(s, x) {
        if (x <= 0) return 0;
        if (x === Infinity) return this.gamma(s);
        
        // 使用级数展开
        let sum = 0;
        let term = 1;
        let n = 0;
        
        while (Math.abs(term) > 1e-15 && n < 1000) {
            if (n > 0) {
                term *= x / (s + n - 1);
            }
            sum += term;
            n++;
        }
        
        return Math.pow(x, s) * Math.exp(-x) * sum;
    }
    
    // χ²分布累积分布函数
    chiSquareCDF(x, df) {
        if (x <= 0) return 0;
        
        const incGamma = this.incompleteGamma(df / 2, x / 2);
        const gamma = this.gamma(df / 2);
        
        return incGamma / gamma;
    }
    
    // χ²分布分位数函数（牛顿-拉夫逊方法）
    chiSquareQuantile(p, df) {
        if (p <= 0) return 0;
        if (p >= 1) return Infinity;
        
        // 初始估计值（使用Wilson-Hilferty变换）
        let x = df;
        if (df > 1) {
            const h = 2 / (9 * df);
            const z = this.normalQuantile(p);
            x = df * Math.pow(1 - h + z * Math.sqrt(h), 3);
            if (x < 0) x = df;
        }
        
        // 牛顿-拉夫逊迭代
        for (let i = 0; i < 50; i++) {
            const fx = this.chiSquareCDF(x, df) - p;
            const fpx = this.chiSquarePDF(x, df);
            
            if (Math.abs(fx) < 1e-10) break;
            if (fpx === 0) break;
            
            const newX = x - fx / fpx;
            if (newX <= 0) {
                x = x / 2;
            } else {
                x = newX;
            }
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
                        min: 0,
                        max: 20,
                        title: {
                            display: true,
                            text: 'χ²值'
                        },
                        grid: {
                            color: '#e0e0e0'
                        }
                    },
                    y: {
                        min: 0,
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
        const mean = df;
        const variance = 2 * df;
        
        document.getElementById('currentMean').innerHTML = `<strong>当前均值:</strong> ${mean}`;
        document.getElementById('currentVariance').innerHTML = `<strong>当前方差:</strong> ${variance}`;
    }
    
    updateChart() {
        const xValues = [];
        const yValues = [];
        
        // 动态调整x轴范围
        const maxX = Math.max(20, this.currentDF * 3);
        const step = maxX / 200;
        
        // 生成数据点
        for (let x = 0.01; x <= maxX; x += step) {
            xValues.push(x);
            yValues.push(this.chiSquarePDF(x, this.currentDF));
        }
        
        const dataset = {
            label: `χ²分布 (df=${this.currentDF})`,
            data: xValues.map((x, i) => ({x: x, y: yValues[i]})),
            borderColor: '#ffc107',
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 4
        };
        
        this.chart.data.datasets = [dataset];
        this.chart.options.scales.x.max = maxX;
        this.chart.update('none');
    }
    
    calculateCDF() {
        const xValue = parseFloat(document.getElementById('cdfInput').value);
        if (isNaN(xValue) || xValue < 0) return;
        
        const cdf = this.chiSquareCDF(xValue, this.currentDF);
        document.getElementById('cdfResult').textContent = 
            `P(χ² ≤ ${xValue.toFixed(3)}) = ${cdf.toFixed(6)}`;
    }
    
    calculateQuantile() {
        const p = parseFloat(document.getElementById('quantileInput').value);
        if (isNaN(p) || p <= 0 || p >= 1) return;
        
        const quantile = this.chiSquareQuantile(p, this.currentDF);
        const subscript = p.toString().replace('0.', '₀.').replace(/(\d)/g, (match) => {
            const subscripts = '₀₁₂₃₄₅₆₇₈₉';
            return subscripts[parseInt(match)];
        });
        
        document.getElementById('quantileResult').textContent = 
            `χ²${subscript} = ${quantile.toFixed(4)}`;
    }
    
    updateCriticalValues() {
        const alphas = [0.10, 0.05, 0.01, 0.001];
        const ids = ['critical_010', 'critical_005', 'critical_001', 'critical_0001'];
        
        alphas.forEach((alpha, i) => {
            const criticalValue = this.chiSquareQuantile(1 - alpha, this.currentDF);
            document.getElementById(ids[i]).textContent = criticalValue.toFixed(4);
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new ChiSquareDistributionCalculator();
});