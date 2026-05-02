class FDistributionCalculator {
    constructor() {
        this.chart = null;
        this.currentDF1 = 5;
        this.currentDF2 = 10;
        
        this.initializeEventListeners();
        this.initializeChart();
        this.updateDistribution();
    }
    
    initializeEventListeners() {
        // 自由度变化
        document.getElementById('df1').addEventListener('input', (e) => {
            this.currentDF1 = parseInt(e.target.value);
            this.updateDistribution();
        });
        
        document.getElementById('df2').addEventListener('input', (e) => {
            this.currentDF2 = parseInt(e.target.value);
            this.updateDistribution();
        });
        
        // 快速选择自由度按钮
        document.querySelectorAll('.df-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const df = parseInt(e.target.dataset.df);
                const type = e.target.dataset.type;
                
                if (type === 'df1') {
                    this.currentDF1 = df;
                    document.getElementById('df1').value = df;
                } else if (type === 'df2') {
                    this.currentDF2 = df;
                    document.getElementById('df2').value = df;
                }
                
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
    
    // Beta函数
    beta(a, b) {
        return this.gamma(a) * this.gamma(b) / this.gamma(a + b);
    }
    
    // F分布概率密度函数
    fPDF(x, df1, df2) {
        if (x <= 0) return 0;
        
        const logPdf = this.logGamma((df1 + df2) / 2) - this.logGamma(df1 / 2) - this.logGamma(df2 / 2) +
                      (df1 / 2) * Math.log(df1) + (df2 / 2) * Math.log(df2) +
                      (df1 / 2 - 1) * Math.log(x) - ((df1 + df2) / 2) * Math.log(df2 + df1 * x);
        
        return Math.exp(logPdf);
    }
    
    // 不完全Beta函数（用于F分布CDF计算）
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
    
    // F分布累积分布函数
    fCDF(x, df1, df2) {
        if (x <= 0) return 0;
        
        const t = (df1 * x) / (df1 * x + df2);
        return this.incompleteBeta(t, df1 / 2, df2 / 2);
    }
    
    // F分布分位数函数（牛顿-拉夫逊方法）
    fQuantile(p, df1, df2) {
        if (p <= 0) return 0;
        if (p >= 1) return Infinity;
        
        // 初始估计值
        let x = 1;
        if (df2 > 2) {
            // 使用均值作为初始估计
            x = df2 / (df2 - 2);
        }
        
        // 牛顿-拉夫逊迭代
        for (let i = 0; i < 50; i++) {
            const fx = this.fCDF(x, df1, df2) - p;
            const fpx = this.fPDF(x, df1, df2);
            
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
                        max: 5,
                        title: {
                            display: true,
                            text: 'F值'
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
        const df1 = this.currentDF1;
        const df2 = this.currentDF2;
        
        let mean = 'undefined';
        if (df2 > 2) {
            mean = (df2 / (df2 - 2)).toFixed(4);
        }
        
        document.getElementById('currentMean').innerHTML = `<strong>当前均值:</strong> ${mean}`;
    }
    
    updateChart() {
        const xValues = [];
        const yValues = [];
        
        // 动态调整x轴范围
        const maxX = Math.max(5, this.currentDF1 + this.currentDF2);
        const step = maxX / 200;
        
        // 生成数据点
        for (let x = 0.01; x <= maxX; x += step) {
            xValues.push(x);
            yValues.push(this.fPDF(x, this.currentDF1, this.currentDF2));
        }
        
        const dataset = {
            label: `F分布 (df₁=${this.currentDF1}, df₂=${this.currentDF2})`,
            data: xValues.map((x, i) => ({x: x, y: yValues[i]})),
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
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
        
        const cdf = this.fCDF(xValue, this.currentDF1, this.currentDF2);
        document.getElementById('cdfResult').textContent = 
            `P(F ≤ ${xValue.toFixed(3)}) = ${cdf.toFixed(6)}`;
    }
    
    calculateQuantile() {
        const p = parseFloat(document.getElementById('quantileInput').value);
        if (isNaN(p) || p <= 0 || p >= 1) return;
        
        const quantile = this.fQuantile(p, this.currentDF1, this.currentDF2);
        const subscript = p.toString().replace('0.', '₀.').replace(/(\d)/g, (match) => {
            const subscripts = '₀₁₂₃₄₅₆₇₈₉';
            return subscripts[parseInt(match)];
        });
        
        document.getElementById('quantileResult').textContent = 
            `F${subscript} = ${quantile.toFixed(4)}`;
    }
    
    updateCriticalValues() {
        const alphas = [0.10, 0.05, 0.01, 0.001];
        const ids = ['critical_010', 'critical_005', 'critical_001', 'critical_0001'];
        
        alphas.forEach((alpha, i) => {
            const criticalValue = this.fQuantile(1 - alpha, this.currentDF1, this.currentDF2);
            document.getElementById(ids[i]).textContent = criticalValue.toFixed(4);
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new FDistributionCalculator();
});