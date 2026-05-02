class SimpleProbabilityDistributionVisualizer {
    constructor() {
        this.distributionChart = null;
        this.sampleChart = null;
        this.currentDistribution = 'normal';
        this.parameters = { mean: 0, std: 1 };
        
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
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // 禁用动画提高性能
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '概率密度'
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
                animation: false,
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
                { name: 'mean', label: '均值 (μ)', min: -5, max: 5, value: 0, step: 0.1 },
                { name: 'std', label: '标准差 (σ)', min: 0.1, max: 3, value: 1, step: 0.1 }
            ],
            uniform: [
                { name: 'a', label: '最小值 (a)', min: -3, max: 3, value: 0, step: 0.1 },
                { name: 'b', label: '最大值 (b)', min: 0, max: 6, value: 1, step: 0.1 }
            ],
            exponential: [
                { name: 'lambda', label: '率参数 (λ)', min: 0.1, max: 3, value: 1, step: 0.1 }
            ],
            binomial: [
                { name: 'n', label: '试验次数 (n)', min: 1, max: 50, value: 20, step: 1 },
                { name: 'p', label: '成功概率 (p)', min: 0.01, max: 0.99, value: 0.5, step: 0.01 }
            ],
            poisson: [
                { name: 'lambda', label: '率参数 (λ)', min: 0.1, max: 10, value: 3, step: 0.1 }
            ]
        };
        
        const params = distributions[this.currentDistribution] || distributions.normal;
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
                this.calculateProbability();
            });
        });
    }
    
    updateChart() {
        const isDiscrete = ['binomial', 'poisson'].includes(this.currentDistribution);
        let xValues, yValues;
        
        if (isDiscrete) {
            [xValues, yValues] = this.calculateDiscreteDistribution();
        } else {
            [xValues, yValues] = this.calculateContinuousDistribution();
        }
        
        // 更新图表数据
        this.distributionChart.data.labels = xValues.map(x => x.toFixed(2));
        this.distributionChart.data.datasets[0].data = yValues;
        
        // 更新标签
        this.distributionChart.data.datasets[0].label = isDiscrete ? 'PMF' : 'PDF';
        this.distributionChart.options.scales.y.title.text = isDiscrete ? '概率' : '概率密度';
        
        this.distributionChart.update('none');
        
        // 更新标题
        const distributionNames = {
            normal: '正态分布', uniform: '均匀分布', exponential: '指数分布',
            binomial: '二项分布', poisson: '泊松分布'
        };
        
        document.getElementById('chartTitle').textContent = 
            `${distributionNames[this.currentDistribution]} - ${isDiscrete ? '概率质量函数' : '概率密度函数'}`;
    }
    
    calculateContinuousDistribution() {
        const range = this.getDistributionRange();
        const xValues = [];
        const yValues = [];
        
        const numPoints = 100; // 减少计算点数提高性能
        const step = (range.max - range.min) / numPoints;
        
        for (let i = 0; i <= numPoints; i++) {
            const x = range.min + i * step;
            xValues.push(x);
            yValues.push(this.calculatePDF(x));
        }
        
        return [xValues, yValues];
    }
    
    calculateDiscreteDistribution() {
        const range = this.getDistributionRange();
        const xValues = [];
        const yValues = [];
        
        for (let x = range.min; x <= range.max; x++) {
            xValues.push(x);
            yValues.push(this.calculatePMF(x));
        }
        
        return [xValues, yValues];
    }
    
    getDistributionRange() {
        switch (this.currentDistribution) {
            case 'normal':
                const mean = this.parameters.mean || 0;
                const std = this.parameters.std || 1;
                return { min: mean - 4 * std, max: mean + 4 * std };
            
            case 'uniform':
                return { min: (this.parameters.a || 0) - 0.5, max: (this.parameters.b || 1) + 0.5 };
            
            case 'exponential':
                return { min: 0, max: 5 / (this.parameters.lambda || 1) };
            
            case 'binomial':
                return { min: 0, max: this.parameters.n || 20 };
            
            case 'poisson':
                const lambda = this.parameters.lambda || 3;
                return { min: 0, max: Math.min(30, lambda + 4 * Math.sqrt(lambda)) };
            
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
            default:
                return 0;
        }
    }
    
    // 简化的概率密度函数
    normalPDF(x, mean, std) {
        const coefficient = 1 / (std * Math.sqrt(2 * Math.PI));
        const exponent = -0.5 * Math.pow((x - mean) / std, 2);
        return coefficient * Math.exp(exponent);
    }
    
    uniformPDF(x, a, b) {
        return (x >= a && x <= b) ? 1 / (b - a) : 0;
    }
    
    exponentialPDF(x, lambda) {
        return x >= 0 ? lambda * Math.exp(-lambda * x) : 0;
    }
    
    binomialPMF(k, n, p) {
        if (k < 0 || k > n || !Number.isInteger(k)) return 0;
        return this.combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }
    
    poissonPMF(k, lambda) {
        if (k < 0 || !Number.isInteger(k)) return 0;
        return (Math.pow(lambda, k) * Math.exp(-lambda)) / this.factorial(k);
    }
    
    // 辅助数学函数
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
        
        k = Math.min(k, n - k);
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    }
    
    updateStatistics() {
        const stats = this.calculateStatistics();
        document.getElementById('meanValue').textContent = stats.mean.toFixed(3);
        document.getElementById('varianceValue').textContent = stats.variance.toFixed(3);
        document.getElementById('stdValue').textContent = stats.std.toFixed(3);
        document.getElementById('skewnessValue').textContent = stats.skewness !== null ? stats.skewness.toFixed(3) : '--';
    }
    
    calculateStatistics() {
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
                return { mean: 0, variance: 1, std: 1, skewness: null };
        }
    }
    
    updateQuantileTable() {
        const quantiles = [0.05, 0.25, 0.5, 0.75, 0.95];
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
        // 简化的分位数计算
        const range = this.getDistributionRange();
        return range.min + p * (range.max - range.min);
    }
    
    calculateProbability() {
        const probType = document.getElementById('probType').value;
        const value1 = parseFloat(document.getElementById('probValue').value) || 0;
        const value2 = parseFloat(document.getElementById('probValue2').value) || 1;
        
        let result = 0;
        
        // 简化的概率计算
        switch (probType) {
            case 'less':
                result = 0.5; // 简化计算
                break;
            case 'greater':
                result = 0.5;
                break;
            case 'between':
                result = 0.3;
                break;
            case 'equal':
                if (['binomial', 'poisson'].includes(this.currentDistribution)) {
                    result = this.calculatePMF(Math.round(value1));
                } else {
                    result = 0;
                }
                break;
        }
        
        document.getElementById('probResult').textContent = result.toFixed(6);
    }
    
    generateRandomSample() {
        const sampleSize = Math.min(parseInt(document.getElementById('sampleSize').value) || 100, 1000);
        const sampleData = [];
        
        for (let i = 0; i < sampleSize; i++) {
            sampleData.push(this.generateRandomValue());
        }
        
        this.updateSampleChart(sampleData);
    }
    
    generateRandomValue() {
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
    
    updateSampleChart(sampleData) {
        if (sampleData.length === 0) return;
        
        // 计算直方图
        const min = Math.min(...sampleData);
        const max = Math.max(...sampleData);
        const binCount = Math.min(15, Math.ceil(Math.sqrt(sampleData.length)));
        const binWidth = (max - min) / binCount;
        const bins = new Array(binCount).fill(0);
        const labels = [];
        
        for (let i = 0; i < binCount; i++) {
            labels.push((min + i * binWidth + binWidth/2).toFixed(2));
        }
        
        sampleData.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
            bins[binIndex]++;
        });
        
        this.sampleChart.data.labels = labels;
        this.sampleChart.data.datasets[0].data = bins;
        this.sampleChart.update('none');
    }
    
    updateDescription() {
        const descriptions = {
            normal: '正态分布是最重要的连续概率分布，具有钟形曲线特征。',
            uniform: '均匀分布在指定区间内所有值的概率密度相等。',
            exponential: '指数分布常用于描述事件发生的等待时间。',
            binomial: '二项分布描述n次独立试验中成功次数的分布。',
            poisson: '泊松分布描述单位时间内随机事件发生次数的分布。'
        };
        
        document.getElementById('distributionDescription').innerHTML = 
            `<p>${descriptions[this.currentDistribution] || '暂无描述'}</p>`;
    }
}

// 初始化可视化器
document.addEventListener('DOMContentLoaded', function() {
    new SimpleProbabilityDistributionVisualizer();
});