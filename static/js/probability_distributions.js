class ProbabilityDistributionVisualizer {
    constructor() {
        this.distributionChart = null;
        this.sampleChart = null;
        this.currentDistribution = 'normal';
        this.parameters = {};
        this.sampleData = [];
        
        this.initializeCharts();
        this.initializeEventListeners();
        this.updateDistribution();
    }
    
    initializeCharts() {
        // 主分布图表
        const ctx1 = document.getElementById('distributionChart').getContext('2d');
        this.distributionChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'PDF',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'CDF',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: false,
                    hidden: true,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '概率密度'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                        min: 0,
                        max: 1,
                        title: {
                            display: true,
                            text: '累积概率'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'x'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
        
        // 样本直方图
        const ctx2 = document.getElementById('sampleChart').getContext('2d');
        this.sampleChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '频数',
                    data: [],
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '频数'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '值'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    initializeEventListeners() {
        // 分布类型选择
        document.getElementById('distributionType').addEventListener('change', (e) => {
            this.currentDistribution = e.target.value;
            this.updateDistribution();
        });
        
        // 显示选项
        ['showPDF', 'showCDF', 'showMean', 'showStd', 'showQuantiles'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateChart();
            });
        });
        
        // 概率计算
        document.getElementById('probType').addEventListener('change', (e) => {
            const probValue2Container = document.getElementById('probValue2Container');
            if (e.target.value === 'between') {
                probValue2Container.style.display = 'block';
            } else {
                probValue2Container.style.display = 'none';
            }
            this.calculateProbability();
        });
        
        ['probValue', 'probValue2'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.calculateProbability();
            });
        });
        
        // 随机样本生成
        document.getElementById('generateSample').addEventListener('click', () => {
            this.generateRandomSample();
        });
    }
    
    updateDistribution() {
        this.createParameterControls();
        this.updateChart();
        this.updateStatistics();
        this.updateQuantileTable();
        this.updateDescription();
        this.calculateProbability();
    }
    
    createParameterControls() {
        const container = document.getElementById('parametersContainer');
        container.innerHTML = '';
        
        const distributions = {
            normal: [
                { name: 'mean', label: '均值 (μ)', min: -10, max: 10, value: 0, step: 0.1 },
                { name: 'std', label: '标准差 (σ)', min: 0.1, max: 5, value: 1, step: 0.1 }
            ],
            uniform: [
                { name: 'a', label: '最小值 (a)', min: -5, max: 5, value: 0, step: 0.1 },
                { name: 'b', label: '最大值 (b)', min: 0, max: 10, value: 1, step: 0.1 }
            ],
            exponential: [
                { name: 'lambda', label: '率参数 (λ)', min: 0.1, max: 5, value: 1, step: 0.1 }
            ],
            gamma: [
                { name: 'alpha', label: '形状参数 (α)', min: 0.1, max: 10, value: 2, step: 0.1 },
                { name: 'beta', label: '尺度参数 (β)', min: 0.1, max: 5, value: 1, step: 0.1 }
            ],
            beta: [
                { name: 'alpha', label: 'α参数', min: 0.1, max: 10, value: 2, step: 0.1 },
                { name: 'beta', label: 'β参数', min: 0.1, max: 10, value: 2, step: 0.1 }
            ],
            chi2: [
                { name: 'df', label: '自由度 (df)', min: 1, max: 30, value: 5, step: 1 }
            ],
            t: [
                { name: 'df', label: '自由度 (df)', min: 1, max: 30, value: 5, step: 1 }
            ],
            f: [
                { name: 'df1', label: '分子自由度', min: 1, max: 30, value: 5, step: 1 },
                { name: 'df2', label: '分母自由度', min: 1, max: 30, value: 10, step: 1 }
            ],
            binomial: [
                { name: 'n', label: '试验次数 (n)', min: 1, max: 100, value: 20, step: 1 },
                { name: 'p', label: '成功概率 (p)', min: 0.01, max: 0.99, value: 0.5, step: 0.01 }
            ],
            poisson: [
                { name: 'lambda', label: '率参数 (λ)', min: 0.1, max: 20, value: 3, step: 0.1 }
            ],
            geometric: [
                { name: 'p', label: '成功概率 (p)', min: 0.01, max: 0.99, value: 0.3, step: 0.01 }
            ],
            hypergeometric: [
                { name: 'N', label: '总体大小 (N)', min: 10, max: 1000, value: 100, step: 1 },
                { name: 'K', label: '成功状态数 (K)', min: 1, max: 50, value: 20, step: 1 },
                { name: 'n', label: '抽样数 (n)', min: 1, max: 50, value: 10, step: 1 }
            ]
        };
        
        const params = distributions[this.currentDistribution] || [];
        this.parameters = {};
        
        params.forEach(param => {
            const div = document.createElement('div');
            div.className = 'mb-3';
            
            div.innerHTML = `
                <label for="${param.name}" class="form-label">${param.label}</label>
                <input type="range" class="form-range" id="${param.name}" 
                       min="${param.min}" max="${param.max}" value="${param.value}" step="${param.step}">
                <div class="d-flex justify-content-between">
                    <small>${param.min}</small>
                    <span id="${param.name}Value" class="fw-bold">${param.value}</span>
                    <small>${param.max}</small>
                </div>
            `;
            
            container.appendChild(div);
            
            this.parameters[param.name] = param.value;
            
            // 添加事件监听器
            const slider = document.getElementById(param.name);
            const valueSpan = document.getElementById(param.name + 'Value');
            
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.parameters[param.name] = value;
                valueSpan.textContent = value;
                this.updateChart();
                this.updateStatistics();
                this.updateQuantileTable();
                this.calculateProbability();
            });
        });
    }
    
    updateChart() {
        const isDiscrete = ['binomial', 'poisson', 'geometric', 'hypergeometric'].includes(this.currentDistribution);
        const showPDF = document.getElementById('showPDF').checked;
        const showCDF = document.getElementById('showCDF').checked;
        
        let xValues, pdfValues, cdfValues;
        
        if (isDiscrete) {
            [xValues, pdfValues, cdfValues] = this.calculateDiscreteDistribution();
        } else {
            [xValues, pdfValues, cdfValues] = this.calculateContinuousDistribution();
        }
        
        // 更新图表数据
        this.distributionChart.data.labels = xValues.map(x => x.toFixed(2));
        this.distributionChart.data.datasets[0].data = pdfValues;
        this.distributionChart.data.datasets[1].data = cdfValues;
        
        // 更新显示状态
        this.distributionChart.data.datasets[0].hidden = !showPDF;
        this.distributionChart.data.datasets[1].hidden = !showCDF;
        
        // 更新Y轴显示
        this.distributionChart.options.scales.y1.display = showCDF;
        
        // 更新标签
        this.distributionChart.data.datasets[0].label = isDiscrete ? 'PMF' : 'PDF';
        this.distributionChart.options.scales.y.title.text = isDiscrete ? '概率' : '概率密度';
        
        // 添加均值和标准差线
        this.addStatisticalLines(xValues);
        
        this.distributionChart.update();
        
        // 更新标题
        const distributionNames = {
            normal: '正态分布', uniform: '均匀分布', exponential: '指数分布',
            gamma: '伽马分布', beta: '贝塔分布', chi2: '卡方分布',
            t: 't分布', f: 'F分布', binomial: '二项分布',
            poisson: '泊松分布', geometric: '几何分布', hypergeometric: '超几何分布'
        };
        
        document.getElementById('chartTitle').textContent = 
            `${distributionNames[this.currentDistribution]} - ${isDiscrete ? '概率质量函数' : '概率密度函数'}`;
    }
    
    calculateContinuousDistribution() {
        const range = this.getDistributionRange();
        const xValues = [];
        const pdfValues = [];
        const cdfValues = [];
        
        const numPoints = 200;
        const step = (range.max - range.min) / numPoints;
        
        for (let i = 0; i <= numPoints; i++) {
            const x = range.min + i * step;
            xValues.push(x);
            pdfValues.push(this.calculatePDF(x));
            cdfValues.push(this.calculateCDF(x));
        }
        
        return [xValues, pdfValues, cdfValues];
    }
    
    calculateDiscreteDistribution() {
        const range = this.getDistributionRange();
        const xValues = [];
        const pdfValues = [];
        const cdfValues = [];
        
        for (let x = range.min; x <= range.max; x++) {
            xValues.push(x);
            pdfValues.push(this.calculatePMF(x));
            cdfValues.push(this.calculateCDF(x));
        }
        
        return [xValues, pdfValues, cdfValues];
    }
    
    getDistributionRange() {
        switch (this.currentDistribution) {
            case 'normal':
                const mean = this.parameters.mean || 0;
                const std = this.parameters.std || 1;
                return { min: mean - 4 * std, max: mean + 4 * std };
            
            case 'uniform':
                return { min: this.parameters.a - 1, max: this.parameters.b + 1 };
            
            case 'exponential':
                return { min: 0, max: 10 / (this.parameters.lambda || 1) };
            
            case 'gamma':
                const alpha = this.parameters.alpha || 2;
                const beta = this.parameters.beta || 1;
                return { min: 0, max: alpha * beta * 3 };
            
            case 'beta':
                return { min: 0, max: 1 };
            
            case 'chi2':
                const df = this.parameters.df || 5;
                return { min: 0, max: df + 3 * Math.sqrt(2 * df) };
            
            case 't':
                return { min: -5, max: 5 };
            
            case 'f':
                return { min: 0, max: 10 };
            
            case 'binomial':
                return { min: 0, max: this.parameters.n || 20 };
            
            case 'poisson':
                const lambda = this.parameters.lambda || 3;
                return { min: 0, max: Math.max(20, lambda + 4 * Math.sqrt(lambda)) };
            
            case 'geometric':
                return { min: 1, max: Math.min(50, Math.ceil(10 / (this.parameters.p || 0.3))) };
            
            case 'hypergeometric':
                return { min: 0, max: Math.min(this.parameters.n || 10, this.parameters.K || 20) };
            
            default:
                return { min: -5, max: 5 };
        }
    }
    
    calculatePDF(x) {
        switch (this.currentDistribution) {
            case 'normal':
                return this.normalPDF(x, this.parameters.mean || 0, this.parameters.std || 1);
            case 'uniform':
                return this.uniformPDF(x, this.parameters.a || 0, this.parameters.b || 1);
            case 'exponential':
                return this.exponentialPDF(x, this.parameters.lambda || 1);
            case 'gamma':
                return this.gammaPDF(x, this.parameters.alpha || 2, this.parameters.beta || 1);
            case 'beta':
                return this.betaPDF(x, this.parameters.alpha || 2, this.parameters.beta || 2);
            case 'chi2':
                return this.chi2PDF(x, this.parameters.df || 5);
            case 't':
                return this.tPDF(x, this.parameters.df || 5);
            case 'f':
                return this.fPDF(x, this.parameters.df1 || 5, this.parameters.df2 || 10);
            default:
                return 0;
        }
    }
    
    calculatePMF(x) {
        switch (this.currentDistribution) {
            case 'binomial':
                return this.binomialPMF(x, this.parameters.n || 20, this.parameters.p || 0.5);
            case 'poisson':
                return this.poissonPMF(x, this.parameters.lambda || 3);
            case 'geometric':
                return this.geometricPMF(x, this.parameters.p || 0.3);
            case 'hypergeometric':
                return this.hypergeometricPMF(x, this.parameters.N || 100, this.parameters.K || 20, this.parameters.n || 10);
            default:
                return 0;
        }
    }
    
    calculateCDF(x) {
        // 简化的CDF计算，实际应用中可能需要更精确的数值积分
        const range = this.getDistributionRange();
        const isDiscrete = ['binomial', 'poisson', 'geometric', 'hypergeometric'].includes(this.currentDistribution);
        
        if (isDiscrete) {
            let sum = 0;
            for (let i = range.min; i <= x; i++) {
                sum += this.calculatePMF(i);
            }
            return sum;
        } else {
            // 数值积分近似
            let sum = 0;
            const step = (x - range.min) / 100;
            for (let i = range.min; i <= x; i += step) {
                sum += this.calculatePDF(i) * step;
            }
            return Math.min(1, sum);
        }
    }
    
    // 概率密度函数实现
    normalPDF(x, mean, std) {
        return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
    }
    
    uniformPDF(x, a, b) {
        return (x >= a && x <= b) ? 1 / (b - a) : 0;
    }
    
    exponentialPDF(x, lambda) {
        return x >= 0 ? lambda * Math.exp(-lambda * x) : 0;
    }
    
    gammaPDF(x, alpha, beta) {
        if (x <= 0) return 0;
        return (Math.pow(x, alpha - 1) * Math.exp(-x / beta)) / (Math.pow(beta, alpha) * this.gamma(alpha));
    }
    
    betaPDF(x, alpha, beta) {
        if (x <= 0 || x >= 1) return 0;
        return (Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1)) / this.beta(alpha, beta);
    }
    
    chi2PDF(x, df) {
        if (x <= 0) return 0;
        return (Math.pow(x, df/2 - 1) * Math.exp(-x/2)) / (Math.pow(2, df/2) * this.gamma(df/2));
    }
    
    tPDF(x, df) {
        return this.gamma((df + 1) / 2) / (Math.sqrt(df * Math.PI) * this.gamma(df / 2)) * 
               Math.pow(1 + x * x / df, -(df + 1) / 2);
    }
    
    fPDF(x, df1, df2) {
        if (x <= 0) return 0;
        const numerator = this.gamma((df1 + df2) / 2) * Math.pow(df1 / df2, df1 / 2) * Math.pow(x, df1 / 2 - 1);
        const denominator = this.gamma(df1 / 2) * this.gamma(df2 / 2) * Math.pow(1 + (df1 / df2) * x, (df1 + df2) / 2);
        return numerator / denominator;
    }
    
    // 概率质量函数实现
    binomialPMF(k, n, p) {
        if (k < 0 || k > n) return 0;
        return this.combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }
    
    poissonPMF(k, lambda) {
        if (k < 0) return 0;
        return (Math.pow(lambda, k) * Math.exp(-lambda)) / this.factorial(k);
    }
    
    geometricPMF(k, p) {
        if (k < 1) return 0;
        return Math.pow(1 - p, k - 1) * p;
    }
    
    hypergeometricPMF(k, N, K, n) {
        if (k < 0 || k > Math.min(n, K)) return 0;
        return (this.combination(K, k) * this.combination(N - K, n - k)) / this.combination(N, n);
    }
    
    // 辅助数学函数
    gamma(z) {
        // Stirling近似
        if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
        z -= 1;
        let x = 0.99999999999980993;
        const coefficients = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
                             -176.61502916214059, 12.507343278686905, -0.13857109526572012,
                             9.9843695780195716e-6, 1.5056327351493116e-7];
        
        for (let i = 0; i < coefficients.length; i++) {
            x += coefficients[i] / (z + i + 1);
        }
        
        const t = z + coefficients.length - 0.5;
        return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }
    
    beta(alpha, beta) {
        return this.gamma(alpha) * this.gamma(beta) / this.gamma(alpha + beta);
    }
    
    factorial(n) {
        if (n <= 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }
    
    combination(n, k) {
        if (k > n || k < 0) return 0;
        if (k === 0 || k === n) return 1;
        
        k = Math.min(k, n - k); // 利用对称性
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    }
    
    addStatisticalLines(xValues) {
        // 这里可以添加均值线、标准差区间等
        // 由于Chart.js的限制，这里简化处理
    }
    
    updateStatistics() {
        const stats = this.calculateStatistics();
        document.getElementById('meanValue').textContent = stats.mean.toFixed(3);
        document.getElementById('varianceValue').textContent = stats.variance.toFixed(3);
        document.getElementById('stdValue').textContent = stats.std.toFixed(3);
        document.getElementById('skewnessValue').textContent = stats.skewness ? stats.skewness.toFixed(3) : '--';
    }
    
    calculateStatistics() {
        // 根据分布类型计算理论统计量
        switch (this.currentDistribution) {
            case 'normal':
                const mean = this.parameters.mean || 0;
                const std = this.parameters.std || 1;
                return {
                    mean: mean,
                    variance: std * std,
                    std: std,
                    skewness: 0
                };
            
            case 'uniform':
                const a = this.parameters.a || 0;
                const b = this.parameters.b || 1;
                return {
                    mean: (a + b) / 2,
                    variance: (b - a) * (b - a) / 12,
                    std: Math.sqrt((b - a) * (b - a) / 12),
                    skewness: 0
                };
            
            case 'exponential':
                const lambda = this.parameters.lambda || 1;
                return {
                    mean: 1 / lambda,
                    variance: 1 / (lambda * lambda),
                    std: 1 / lambda,
                    skewness: 2
                };
            
            case 'binomial':
                const n = this.parameters.n || 20;
                const p = this.parameters.p || 0.5;
                return {
                    mean: n * p,
                    variance: n * p * (1 - p),
                    std: Math.sqrt(n * p * (1 - p)),
                    skewness: (1 - 2 * p) / Math.sqrt(n * p * (1 - p))
                };
            
            case 'poisson':
                const poissonLambda = this.parameters.lambda || 3;
                return {
                    mean: poissonLambda,
                    variance: poissonLambda,
                    std: Math.sqrt(poissonLambda),
                    skewness: 1 / Math.sqrt(poissonLambda)
                };
            
            default:
                return {
                    mean: 0,
                    variance: 1,
                    std: 1,
                    skewness: null
                };
        }
    }
    
    updateQuantileTable() {
        const quantiles = [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99];
        const tbody = document.getElementById('quantileTable');
        tbody.innerHTML = '';
        
        quantiles.forEach(q => {
            const value = this.calculateQuantile(q);
            const row = tbody.insertRow();
            row.insertCell(0).textContent = `${(q * 100).toFixed(0)}%`;
            row.insertCell(1).textContent = value.toFixed(3);
        });
    }
    
    calculateQuantile(p) {
        // 简化的分位数计算，使用二分搜索
        const range = this.getDistributionRange();
        let low = range.min;
        let high = range.max;
        const tolerance = 1e-6;
        
        while (high - low > tolerance) {
            const mid = (low + high) / 2;
            const cdf = this.calculateCDF(mid);
            
            if (cdf < p) {
                low = mid;
            } else {
                high = mid;
            }
        }
        
        return (low + high) / 2;
    }
    
    calculateProbability() {
        const probType = document.getElementById('probType').value;
        const value1 = parseFloat(document.getElementById('probValue').value);
        const value2 = parseFloat(document.getElementById('probValue2').value);
        
        let result;
        
        switch (probType) {
            case 'less':
                result = this.calculateCDF(value1);
                break;
            case 'greater':
                result = 1 - this.calculateCDF(value1);
                break;
            case 'between':
                result = this.calculateCDF(value2) - this.calculateCDF(value1);
                break;
            case 'equal':
                if (['binomial', 'poisson', 'geometric', 'hypergeometric'].includes(this.currentDistribution)) {
                    result = this.calculatePMF(Math.round(value1));
                } else {
                    result = 0; // 连续分布中单点概率为0
                }
                break;
            default:
                result = 0;
        }
        
        document.getElementById('probResult').textContent = result.toFixed(6);
    }
    
    generateRandomSample() {
        const sampleSize = parseInt(document.getElementById('sampleSize').value);
        this.sampleData = [];
        
        for (let i = 0; i < sampleSize; i++) {
            this.sampleData.push(this.generateRandomValue());
        }
        
        this.updateSampleChart();
    }
    
    generateRandomValue() {
        // 简化的随机数生成，实际应用中需要更精确的方法
        switch (this.currentDistribution) {
            case 'normal':
                return this.normalRandom(this.parameters.mean || 0, this.parameters.std || 1);
            case 'uniform':
                return this.uniformRandom(this.parameters.a || 0, this.parameters.b || 1);
            case 'exponential':
                return this.exponentialRandom(this.parameters.lambda || 1);
            default:
                return this.normalRandom(0, 1);
        }
    }
    
    normalRandom(mean, std) {
        // Box-Muller变换
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    
    uniformRandom(a, b) {
        return a + Math.random() * (b - a);
    }
    
    exponentialRandom(lambda) {
        return -Math.log(1 - Math.random()) / lambda;
    }
    
    updateSampleChart() {
        if (this.sampleData.length === 0) return;
        
        // 计算直方图
        const min = Math.min(...this.sampleData);
        const max = Math.max(...this.sampleData);
        const binCount = Math.min(20, Math.ceil(Math.sqrt(this.sampleData.length)));
        const binWidth = (max - min) / binCount;
        const bins = new Array(binCount).fill(0);
        const labels = [];
        
        for (let i = 0; i < binCount; i++) {
            labels.push((min + i * binWidth + binWidth/2).toFixed(2));
        }
        
        this.sampleData.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
            bins[binIndex]++;
        });
        
        this.sampleChart.data.labels = labels;
        this.sampleChart.data.datasets[0].data = bins;
        this.sampleChart.update();
    }
    
    updateDescription() {
        const descriptions = {
            normal: '正态分布是最重要的连续概率分布，具有钟形曲线特征。许多自然现象都遵循正态分布，它在统计推断中起着核心作用。',
            uniform: '均匀分布在指定区间内所有值的概率密度相等。它常用于随机数生成和蒙特卡罗模拟。',
            exponential: '指数分布常用于描述事件发生的等待时间，如设备故障时间、服务时间等。它具有无记忆性质。',
            gamma: '伽马分布是指数分布的推广，常用于描述等待时间和可靠性分析。',
            beta: '贝塔分布定义在[0,1]区间上，常用于描述概率、比例等有界随机变量。',
            chi2: '卡方分布在假设检验和置信区间构造中广泛应用，特别是在方差分析中。',
            t: 't分布用于小样本情况下的均值推断，当样本量增大时趋向于标准正态分布。',
            f: 'F分布用于比较两个方差，在方差分析和回归分析中起重要作用。',
            binomial: '二项分布描述n次独立试验中成功次数的分布，是最基本的离散分布之一。',
            poisson: '泊松分布描述单位时间或空间内随机事件发生次数的分布，如电话呼叫、交通事故等。',
            geometric: '几何分布描述首次成功所需的试验次数，具有无记忆性质。',
            hypergeometric: '超几何分布描述无放回抽样中成功次数的分布，常用于质量控制和抽样调查。'
        };
        
        document.getElementById('distributionDescription').innerHTML = 
            `<p>${descriptions[this.currentDistribution] || '暂无描述'}</p>`;
    }
}

// 初始化可视化器
document.addEventListener('DOMContentLoaded', function() {
    new ProbabilityDistributionVisualizer();
});