class OptimizedProbabilityDistributionVisualizer {
    constructor() {
        this.distributionChart = null;
        this.sampleChart = null;
        this.currentDistribution = 'normal';
        this.parameters = { mean: 0, std: 1 };
        this.chartData = { xValues: [], pdfValues: [], cdfValues: [] };
        
        this.initializeCharts();
        this.initializeEventListeners();
        this.updateDistribution();
    }
    
    initializeCharts() {
        // 主分布图表 - 简化配置
        const ctx1 = document.getElementById('distributionChart').getContext('2d');
        this.distributionChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'PDF',
                    data: [],
                    borderColor: '#4BC0C0',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    borderWidth: 2
                }, {
                    label: 'CDF',
                    data: [],
                    borderColor: '#FF6384',
                    fill: false,
                    hidden: true,
                    pointRadius: 0,
                    borderWidth: 2,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { intersect: false },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: '概率密度' } },
                    y1: { type: 'linear', display: false, position: 'right', min: 0, max: 1 },
                    x: { title: { display: true, text: 'x' } }
                },
                plugins: { legend: { display: true } }
            }
        });
        
        // 样本直方图 - 简化配置
        const ctx2 = document.getElementById('sampleChart').getContext('2d');
        this.sampleChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '频数',
                    data: [],
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: '频数' } },
                    x: { title: { display: true, text: '值' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
    
    initializeEventListeners() {
        // 分布类型选择
        document.getElementById('distributionType').addEventListener('change', (e) => {
            this.currentDistribution = e.target.value;
            this.updateDistribution();
        });
        
        // 显示选项 - 简化处理
        ['showPDF', 'showCDF', 'showMean', 'showStd', 'showQuantiles'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateDisplayOptions();
            });
        });
        
        // 概率计算
        document.getElementById('probType').addEventListener('change', (e) => {
            document.getElementById('probValue2Container').style.display = 
                e.target.value === 'between' ? 'block' : 'none';
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
    
    updateDisplayOptions() {
        const showPDF = document.getElementById('showPDF').checked;
        const showCDF = document.getElementById('showCDF').checked;
        const showQuantiles = document.getElementById('showQuantiles').checked;
        
        // 更新图表显示
        this.distributionChart.data.datasets[0].hidden = !showPDF;
        this.distributionChart.data.datasets[1].hidden = !showCDF;
        this.distributionChart.options.scales.y1.display = showCDF;
        
        // 更新分位数表格显示
        const quantileCard = document.getElementById('quantileTable').closest('.card');
        quantileCard.style.display = showQuantiles ? 'block' : 'none';
        
        // 简化的均值和标准差显示
        this.addSimpleStatLines();
        
        this.distributionChart.update('none');
    }
    
    addSimpleStatLines() {
        const showMean = document.getElementById('showMean').checked;
        const showStd = document.getElementById('showStd').checked;
        
        // 移除现有统计线
        this.distributionChart.data.datasets = this.distributionChart.data.datasets.slice(0, 2);
        
        if (showMean || showStd) {
            const stats = this.calculateStatistics();
            const labels = this.distributionChart.data.labels;
            
            if (showMean) {
                // 添加简单的均值线
                const meanData = labels.map(label => {
                    const x = parseFloat(label);
                    return Math.abs(x - stats.mean) < 0.1 ? Math.max(...this.chartData.pdfValues) * 0.8 : null;
                });
                
                this.distributionChart.data.datasets.push({
                    label: '均值',
                    data: meanData,
                    borderColor: '#FF0000',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                });
            }
        }
    }
    
    updateDistribution() {
        this.createParameterControls();
        this.calculateDistributionData();
        this.updateChart();
        this.updateStatistics();
        this.updateQuantileTable();
        this.updateDescription();
        this.calculateProbability();
    }
    
    calculateDistributionData() {
        const range = this.getDistributionRange();
        const isDiscrete = ['binomial', 'poisson'].includes(this.currentDistribution);
        
        this.chartData = { xValues: [], pdfValues: [], cdfValues: [] };
        
        if (isDiscrete) {
            for (let x = range.min; x <= range.max; x++) {
                this.chartData.xValues.push(x);
                this.chartData.pdfValues.push(this.calculatePMF(x));
                this.chartData.cdfValues.push(this.calculateSimpleCDF(x));
            }
        } else {
            const numPoints = 50; // 进一步减少计算点
            const step = (range.max - range.min) / numPoints;
            
            for (let i = 0; i <= numPoints; i++) {
                const x = range.min + i * step;
                this.chartData.xValues.push(x);
                this.chartData.pdfValues.push(this.calculatePDF(x));
                this.chartData.cdfValues.push(this.calculateSimpleCDF(x));
            }
        }
    }
    
    calculateSimpleCDF(x) {
        // 超简化的CDF计算
        const stats = this.calculateStatistics();
        
        switch (this.currentDistribution) {
            case 'normal':
                const z = (x - stats.mean) / stats.std;
                return 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
            case 'uniform':
                const a = this.parameters.a || 0;
                const b = this.parameters.b || 1;
                if (x <= a) return 0;
                if (x >= b) return 1;
                return (x - a) / (b - a);
            case 'exponential':
                const lambda = this.parameters.lambda || 1;
                return x <= 0 ? 0 : 1 - Math.exp(-lambda * x);
            default:
                return 0.5; // 简化返回
        }
    }
    
    createParameterControls() {
        const container = document.getElementById('parametersContainer');
        container.innerHTML = '';
        
        const distributions = {
            normal: [
                { name: 'mean', label: '均值 (μ)', min: -3, max: 3, value: 0, step: 0.5 },
                { name: 'std', label: '标准差 (σ)', min: 0.5, max: 2, value: 1, step: 0.1 }
            ],
            uniform: [
                { name: 'a', label: '最小值 (a)', min: -2, max: 2, value: 0, step: 0.1 },
                { name: 'b', label: '最大值 (b)', min: 1, max: 4, value: 1, step: 0.1 }
            ],
            exponential: [
                { name: 'lambda', label: '率参数 (λ)', min: 0.2, max: 2, value: 1, step: 0.1 }
            ],
            binomial: [
                { name: 'n', label: '试验次数 (n)', min: 5, max: 30, value: 20, step: 1 },
                { name: 'p', label: '成功概率 (p)', min: 0.1, max: 0.9, value: 0.5, step: 0.05 }
            ],
            poisson: [
                { name: 'lambda', label: '率参数 (λ)', min: 1, max: 8, value: 3, step: 0.5 }
            ]
        };
        
        const params = distributions[this.currentDistribution] || distributions.normal;
        this.parameters = {};
        
        params.forEach(param => {
            const div = document.createElement('div');
            div.className = 'mb-3';
            div.innerHTML = `
                <label class="form-label">${param.label}</label>
                <input type="range" class="form-range" id="${param.name}" 
                       min="${param.min}" max="${param.max}" value="${param.value}" step="${param.step}">
                <div class="text-center">
                    <span id="${param.name}Value" class="fw-bold">${param.value}</span>
                </div>
            `;
            
            container.appendChild(div);
            this.parameters[param.name] = param.value;
            
            const slider = document.getElementById(param.name);
            const valueSpan = document.getElementById(param.name + 'Value');
            
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.parameters[param.name] = value;
                valueSpan.textContent = value;
                this.calculateDistributionData();
                this.updateChart();
                this.updateStatistics();
                this.calculateProbability();
            });
        });
    }
    
    updateChart() {
        const isDiscrete = ['binomial', 'poisson'].includes(this.currentDistribution);
        
        this.distributionChart.data.labels = this.chartData.xValues.map(x => x.toFixed(1));
        this.distributionChart.data.datasets[0].data = this.chartData.pdfValues;
        this.distributionChart.data.datasets[1].data = this.chartData.cdfValues;
        
        this.distributionChart.data.datasets[0].label = isDiscrete ? 'PMF' : 'PDF';
        this.distributionChart.options.scales.y.title.text = isDiscrete ? '概率' : '概率密度';
        
        this.updateDisplayOptions();
        
        const names = { normal: '正态分布', uniform: '均匀分布', exponential: '指数分布', binomial: '二项分布', poisson: '泊松分布' };
        document.getElementById('chartTitle').textContent = `${names[this.currentDistribution]} - ${isDiscrete ? '概率质量函数' : '概率密度函数'}`;
    }
    
    getDistributionRange() {
        switch (this.currentDistribution) {
            case 'normal':
                const mean = this.parameters.mean || 0;
                const std = this.parameters.std || 1;
                return { min: mean - 3 * std, max: mean + 3 * std };
            case 'uniform':
                return { min: (this.parameters.a || 0) - 0.5, max: (this.parameters.b || 1) + 0.5 };
            case 'exponential':
                return { min: 0, max: 4 / (this.parameters.lambda || 1) };
            case 'binomial':
                return { min: 0, max: this.parameters.n || 20 };
            case 'poisson':
                const lambda = this.parameters.lambda || 3;
                return { min: 0, max: Math.min(20, lambda + 3 * Math.sqrt(lambda)) };
            default:
                return { min: -3, max: 3 };
        }
    }
    
    calculatePDF(x) {
        switch (this.currentDistribution) {
            case 'normal':
                const mean = this.parameters.mean || 0;
                const std = this.parameters.std || 1;
                return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
            case 'uniform':
                const a = this.parameters.a || 0;
                const b = this.parameters.b || 1;
                return (x >= a && x <= b) ? 1 / (b - a) : 0;
            case 'exponential':
                const lambda = this.parameters.lambda || 1;
                return x >= 0 ? lambda * Math.exp(-lambda * x) : 0;
            default:
                return 0;
        }
    }
    
    calculatePMF(x) {
        switch (this.currentDistribution) {
            case 'binomial':
                const n = this.parameters.n || 20;
                const p = this.parameters.p || 0.5;
                if (x < 0 || x > n || !Number.isInteger(x)) return 0;
                return this.binomialCoeff(n, x) * Math.pow(p, x) * Math.pow(1 - p, n - x);
            case 'poisson':
                const lambda = this.parameters.lambda || 3;
                if (x < 0 || !Number.isInteger(x)) return 0;
                return (Math.pow(lambda, x) * Math.exp(-lambda)) / this.factorial(x);
            default:
                return 0;
        }
    }
    
    factorial(n) {
        if (n <= 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
    }
    
    binomialCoeff(n, k) {
        if (k > n || k < 0) return 0;
        if (k === 0 || k === n) return 1;
        k = Math.min(k, n - k);
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    }
    
    calculateStatistics() {
        switch (this.currentDistribution) {
            case 'normal':
                const mean = this.parameters.mean || 0;
                const std = this.parameters.std || 1;
                return { mean, variance: std * std, std, skewness: 0 };
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
                return { mean: 1 / lambda, variance: 1 / (lambda * lambda), std: 1 / lambda, skewness: 2 };
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
    
    updateStatistics() {
        const stats = this.calculateStatistics();
        document.getElementById('meanValue').textContent = stats.mean.toFixed(2);
        document.getElementById('varianceValue').textContent = stats.variance.toFixed(2);
        document.getElementById('stdValue').textContent = stats.std.toFixed(2);
        document.getElementById('skewnessValue').textContent = stats.skewness !== null ? stats.skewness.toFixed(2) : '--';
    }
    
    updateQuantileTable() {
        const quantiles = [0.1, 0.25, 0.5, 0.75, 0.9];
        const tbody = document.getElementById('quantileTable');
        tbody.innerHTML = '';
        
        quantiles.forEach(q => {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = `${(q * 100)}%`;
            row.insertCell(1).textContent = this.calculateQuantile(q).toFixed(2);
        });
    }
    
    calculateQuantile(p) {
        const stats = this.calculateStatistics();
        const range = this.getDistributionRange();
        
        // 简化分位数计算
        switch (this.currentDistribution) {
            case 'normal':
                const z = p < 0.5 ? -Math.sqrt(-2 * Math.log(2 * p)) : Math.sqrt(-2 * Math.log(2 * (1 - p)));
                return stats.mean + (p < 0.5 ? -1 : 1) * Math.abs(z) * stats.std;
            case 'uniform':
                const a = this.parameters.a || 0;
                const b = this.parameters.b || 1;
                return a + p * (b - a);
            default:
                return range.min + p * (range.max - range.min);
        }
    }
    
    calculateProbability() {
        const probType = document.getElementById('probType').value;
        const value1 = parseFloat(document.getElementById('probValue').value) || 0;
        const value2 = parseFloat(document.getElementById('probValue2').value) || 1;
        
        let result = 0;
        
        switch (probType) {
            case 'less':
                result = this.calculateSimpleCDF(value1);
                break;
            case 'greater':
                result = 1 - this.calculateSimpleCDF(value1);
                break;
            case 'between':
                result = this.calculateSimpleCDF(value2) - this.calculateSimpleCDF(value1);
                break;
            case 'equal':
                if (['binomial', 'poisson'].includes(this.currentDistribution)) {
                    result = this.calculatePMF(Math.round(value1));
                } else {
                    result = 0;
                }
                break;
        }
        
        document.getElementById('probResult').textContent = Math.max(0, Math.min(1, result)).toFixed(4);
    }
    
    generateRandomSample() {
        const sampleSize = Math.min(parseInt(document.getElementById('sampleSize').value) || 100, 500);
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
        
        const min = Math.min(...sampleData);
        const max = Math.max(...sampleData);
        const binCount = Math.min(10, Math.ceil(Math.sqrt(sampleData.length)));
        const binWidth = (max - min) / binCount;
        const bins = new Array(binCount).fill(0);
        const labels = [];
        
        for (let i = 0; i < binCount; i++) {
            labels.push((min + i * binWidth + binWidth/2).toFixed(1));
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

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    new OptimizedProbabilityDistributionVisualizer();
});