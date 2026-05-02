class EnhancedProbabilityDistributionVisualizer {
    constructor() {
        this.distributionChart = null;
        this.sampleChart = null;
        this.currentDistribution = 'normal';
        this.parameters = { mean: 0, std: 1 };
        this.displayRange = { xMin: -5, xMax: 5, yMax: 0.5 };
        this.chartData = { xValues: [], pdfValues: [], cdfValues: [] };
        
        this.initializeCharts();
        this.initializeEventListeners();
        this.updateDistribution();
    }
    
    initializeCharts() {
        // 主分布图表 - 固定坐标轴范围
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
                    y: { 
                        min: 0, 
                        max: this.displayRange.yMax,
                        title: { display: true, text: '概率密度' }
                    },
                    y1: { 
                        type: 'linear', 
                        display: false, 
                        position: 'right', 
                        min: 0, 
                        max: 1,
                        title: { display: true, text: '累积概率' }
                    },
                    x: { 
                        min: this.displayRange.xMin,
                        max: this.displayRange.xMax,
                        title: { display: true, text: 'x' }
                    }
                },
                plugins: { 
                    legend: { display: true },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `x = ${parseFloat(context[0].label).toFixed(2)}`;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`;
                            }
                        }
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
            this.setDefaultDisplayRange();
            this.updateDistribution();
        });
        
        // 显示范围控制
        ['xMin', 'xMax', 'yMax'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                console.log(`Setting ${id} to ${value}`); // 调试信息
                this.displayRange[id] = value;
                
                // 如果是X轴范围变化，需要重新计算数据
                if (id === 'xMin' || id === 'xMax') {
                    this.calculateDistributionData();
                    this.updateChart();
                }
                
                this.updateChartRange();
            });
        });
        
        // 重置范围按钮
        document.getElementById('resetRange').addEventListener('click', () => {
            this.setDefaultDisplayRange();
            this.updateDisplayRangeInputs();
            this.updateChartRange();
            this.updateChart();
        });
        
        // 显示选项
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
    
    setDefaultDisplayRange() {
        // 根据分布类型设置合适的默认显示范围
        switch (this.currentDistribution) {
            case 'normal':
                this.displayRange = { xMin: -5, xMax: 5, yMax: 0.5 };
                break;
            case 'uniform':
                this.displayRange = { xMin: -3, xMax: 6, yMax: 1.2 };
                break;
            case 'exponential':
                this.displayRange = { xMin: 0, xMax: 8, yMax: 3 };
                break;
            case 'binomial':
                this.displayRange = { xMin: 0, xMax: 30, yMax: 0.3 };
                break;
            case 'poisson':
                this.displayRange = { xMin: 0, xMax: 15, yMax: 0.4 };
                break;
            default:
                this.displayRange = { xMin: -5, xMax: 5, yMax: 0.5 };
        }
    }
    
    updateDisplayRangeInputs() {
        document.getElementById('xMin').value = this.displayRange.xMin;
        document.getElementById('xMax').value = this.displayRange.xMax;
        document.getElementById('yMax').value = this.displayRange.yMax;
    }
    
    updateChartRange() {
        // 更新图表的坐标轴范围
        console.log(`Updating chart range: xMin=${this.displayRange.xMin}, xMax=${this.displayRange.xMax}, yMax=${this.displayRange.yMax}`);
        
        // 确保Chart.js正确应用新的坐标轴范围
        if (this.distributionChart && this.distributionChart.options && this.distributionChart.options.scales) {
            this.distributionChart.options.scales.x.min = this.displayRange.xMin;
            this.distributionChart.options.scales.x.max = this.displayRange.xMax;
            this.distributionChart.options.scales.y.max = this.displayRange.yMax;
            
            // 强制重新渲染图表
            this.distributionChart.update('active');
            
            console.log(`Chart scales after update: x.min=${this.distributionChart.options.scales.x.min}, x.max=${this.distributionChart.options.scales.x.max}`);
        }
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
        
        // 添加统计线
        this.addStatisticalLines();
        
        this.distributionChart.update('none');
    }
    
    addStatisticalLines() {
        const showMean = document.getElementById('showMean').checked;
        const showStd = document.getElementById('showStd').checked;
        
        // 移除现有统计线
        this.distributionChart.data.datasets = this.distributionChart.data.datasets.slice(0, 2);
        
        if (showMean || showStd) {
            const stats = this.calculateStatistics();
            
            if (showMean) {
                // 添加均值线 - 垂直线从底部到顶部
                const meanData = this.chartData.xValues.map(x => {
                    return Math.abs(x - stats.mean) < 0.05 ? this.displayRange.yMax : null;
                });
                
                this.distributionChart.data.datasets.push({
                    label: '均值线',
                    data: meanData,
                    borderColor: '#FF0000',
                    borderWidth: 3,
                    borderDash: [8, 4],
                    fill: false,
                    pointRadius: 0,
                    tension: 0
                });
            }
            
            if (showStd) {
                // 添加±1σ区间高亮
                const leftBound = stats.mean - stats.std;
                const rightBound = stats.mean + stats.std;
                
                const stdData = this.chartData.xValues.map((x, i) => {
                    if (x >= leftBound && x <= rightBound) {
                        return this.chartData.pdfValues[i];
                    }
                    return null;
                });
                
                this.distributionChart.data.datasets.push({
                    label: '±1σ区间',
                    data: stdData,
                    borderColor: '#FFA500',
                    backgroundColor: 'rgba(255, 165, 0, 0.3)',
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 1
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
        this.updateDisplayRangeInputs();
    }
    
    calculateDistributionData() {
        // 使用固定的x范围计算分布数据
        const isDiscrete = ['binomial', 'poisson'].includes(this.currentDistribution);
        
        this.chartData = { xValues: [], pdfValues: [], cdfValues: [] };
        
        if (isDiscrete) {
            // 离散分布：在显示范围内的整数点
            for (let x = Math.max(0, Math.ceil(this.displayRange.xMin)); x <= this.displayRange.xMax; x++) {
                this.chartData.xValues.push(x);
                this.chartData.pdfValues.push(this.calculatePMF(x));
                this.chartData.cdfValues.push(this.calculateSimpleCDF(x));
            }
        } else {
            // 连续分布：在显示范围内均匀采样
            const numPoints = 100;
            const step = (this.displayRange.xMax - this.displayRange.xMin) / numPoints;
            
            for (let i = 0; i <= numPoints; i++) {
                const x = this.displayRange.xMin + i * step;
                this.chartData.xValues.push(x);
                this.chartData.pdfValues.push(this.calculatePDF(x));
                this.chartData.cdfValues.push(this.calculateSimpleCDF(x));
            }
        }
    }
    
    calculateSimpleCDF(x) {
        const stats = this.calculateStatistics();
        
        switch (this.currentDistribution) {
            case 'normal':
                // 使用误差函数近似
                const z = (x - stats.mean) / stats.std;
                return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
            case 'uniform':
                const a = this.parameters.a || 0;
                const b = this.parameters.b || 1;
                if (x <= a) return 0;
                if (x >= b) return 1;
                return (x - a) / (b - a);
            case 'exponential':
                const lambda = this.parameters.lambda || 1;
                return x <= 0 ? 0 : 1 - Math.exp(-lambda * x);
            case 'binomial':
                // 累积二项概率
                let sum = 0;
                const n = this.parameters.n || 20;
                const p = this.parameters.p || 0.5;
                for (let k = 0; k <= Math.floor(x); k++) {
                    sum += this.binomialCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
                }
                return sum;
            case 'poisson':
                // 累积泊松概率
                let poissonSum = 0;
                const poissonLambda = this.parameters.lambda || 3;
                for (let k = 0; k <= Math.floor(x); k++) {
                    poissonSum += (Math.pow(poissonLambda, k) * Math.exp(-poissonLambda)) / this.factorial(k);
                }
                return poissonSum;
            default:
                return 0.5;
        }
    }
    
    // 误差函数近似
    erf(x) {
        // Abramowitz and Stegun approximation
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
    
    createParameterControls() {
        const container = document.getElementById('parametersContainer');
        container.innerHTML = '';
        
        const distributions = {
            normal: [
                { name: 'mean', label: '均值 (μ)', min: -3, max: 3, value: 0, step: 0.2 },
                { name: 'std', label: '标准差 (σ)', min: 0.2, max: 2, value: 1, step: 0.1 }
            ],
            uniform: [
                { name: 'a', label: '最小值 (a)', min: -2, max: 2, value: 0, step: 0.2 },
                { name: 'b', label: '最大值 (b)', min: 1, max: 4, value: 1, step: 0.2 }
            ],
            exponential: [
                { name: 'lambda', label: '率参数 (λ)', min: 0.2, max: 2, value: 1, step: 0.1 }
            ],
            binomial: [
                { name: 'n', label: '试验次数 (n)', min: 5, max: 25, value: 20, step: 1 },
                { name: 'p', label: '成功概率 (p)', min: 0.1, max: 0.9, value: 0.5, step: 0.05 }
            ],
            poisson: [
                { name: 'lambda', label: '率参数 (λ)', min: 1, max: 8, value: 3, step: 0.2 }
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
                    <span id="${param.name}Value" class="fw-bold text-primary">${param.value}</span>
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
        
        // 更新图表数据
        this.distributionChart.data.labels = this.chartData.xValues.map(x => x.toFixed(1));
        this.distributionChart.data.datasets[0].data = this.chartData.pdfValues;
        this.distributionChart.data.datasets[1].data = this.chartData.cdfValues;
        
        // 更新图表类型和标签
        if (isDiscrete) {
            this.distributionChart.config.type = 'bar';
            this.distributionChart.data.datasets[0].type = 'bar';
            this.distributionChart.data.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.6)';
            this.distributionChart.data.datasets[0].borderColor = '#4BC0C0';
            this.distributionChart.data.datasets[0].borderWidth = 1;
        } else {
            this.distributionChart.config.type = 'line';
            this.distributionChart.data.datasets[0].type = 'line';
            this.distributionChart.data.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.1)';
            this.distributionChart.data.datasets[0].borderColor = '#4BC0C0';
            this.distributionChart.data.datasets[0].borderWidth = 2;
        }
        
        this.distributionChart.data.datasets[0].label = isDiscrete ? 'PMF' : 'PDF';
        this.distributionChart.options.scales.y.title.text = isDiscrete ? '概率' : '概率密度';
        
        // 应用显示选项
        this.updateDisplayOptions();
        
        // 更新标题
        const names = { 
            normal: '正态分布', uniform: '均匀分布', exponential: '指数分布', 
            binomial: '二项分布', poisson: '泊松分布' 
        };
        document.getElementById('chartTitle').textContent = 
            `${names[this.currentDistribution]} - ${isDiscrete ? '概率质量函数' : '概率密度函数'}`;
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
        
        switch (this.currentDistribution) {
            case 'normal':
                // 使用逆误差函数近似
                const z = Math.sqrt(2) * this.inverseErf(2 * p - 1);
                return stats.mean + z * stats.std;
            case 'uniform':
                const a = this.parameters.a || 0;
                const b = this.parameters.b || 1;
                return a + p * (b - a);
            case 'exponential':
                const lambda = this.parameters.lambda || 1;
                return -Math.log(1 - p) / lambda;
            default:
                return stats.mean + (p - 0.5) * 2 * stats.std;
        }
    }
    
    // 逆误差函数近似
    inverseErf(x) {
        const a = 0.147;
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        
        const ln1MinusX2 = Math.log(1 - x * x);
        const term1 = 2 / (Math.PI * a) + ln1MinusX2 / 2;
        const term2 = ln1MinusX2 / a;
        
        return sign * Math.sqrt(Math.sqrt(term1 * term1 - term2) - term1);
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
        const binCount = Math.min(15, Math.ceil(Math.sqrt(sampleData.length)));
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
            normal: '正态分布是最重要的连续概率分布，具有钟形曲线特征。调节均值μ可以左右移动曲线，调节标准差σ可以改变曲线的宽窄。',
            uniform: '均匀分布在指定区间[a,b]内所有值的概率密度相等。调节a和b可以改变分布的位置和宽度。',
            exponential: '指数分布常用于描述事件发生的等待时间。调节率参数λ可以改变分布的衰减速度，λ越大衰减越快。',
            binomial: '二项分布描述n次独立试验中成功次数的分布。调节n改变试验次数，调节p改变每次试验的成功概率。',
            poisson: '泊松分布描述单位时间内随机事件发生次数的分布。调节λ可以改变事件发生的平均频率。'
        };
        
        document.getElementById('distributionDescription').innerHTML = 
            `<p>${descriptions[this.currentDistribution] || '暂无描述'}</p>`;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    new EnhancedProbabilityDistributionVisualizer();
});