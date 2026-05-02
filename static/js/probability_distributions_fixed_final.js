class ProbabilityDistributionVisualizer {
    constructor() {
        this.currentDistribution = 'normal';
        this.parameters = {};
        this.displayRange = { xMin: -5, xMax: 5, yMax: 0.5 };
        this.chartData = { xValues: [], pdfValues: [], cdfValues: [] };
        
        this.initializeCharts();
        this.setupEventListeners();
        this.updateDistribution();
    }
    
    initializeCharts() {
        // 主分布图表 - 初始化为连续分布
        const ctx1 = document.getElementById('distributionChart').getContext('2d');
        this.distributionChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '概率密度函数 (PDF)',
                    data: [],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }, {
                    label: '累积分布函数 (CDF)',
                    data: [],
                    borderColor: '#28a745',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    yAxisID: 'y1',
                    hidden: true
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
                        type: 'linear',
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
                    label: '样本频率',
                    data: [],
                    backgroundColor: 'rgba(255, 193, 7, 0.6)',
                    borderColor: '#ffc107',
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
                        title: { display: true, text: '频率' }
                    },
                    x: { 
                        title: { display: true, text: 'x' }
                    }
                },
                plugins: { 
                    legend: { display: true }
                }
            }
        });
        
        // 随机样本散点图
        const ctx3 = document.getElementById('sampleScatterChart').getContext('2d');
        this.sampleScatterChart = new Chart(ctx3, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: '随机样本',
                    data: [],
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    y: { 
                        title: { display: true, text: '样本值' }
                    },
                    x: { 
                        title: { display: true, text: '样本序号' },
                        beginAtZero: true
                    }
                },
                plugins: { 
                    legend: { display: true }
                }
            }
        });
    }
    
    setupEventListeners() {
        // 分布类型选择
        document.getElementById('distributionType').addEventListener('change', (e) => {
            this.currentDistribution = e.target.value;
            this.setDefaultDisplayRange();
            this.updateDistribution();
        });
        
        // 显示范围控制 - 修复版本
        ['xMin', 'xMax', 'yMax'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                console.log(`Setting ${id} to ${value}`);
                this.displayRange[id] = value;
                
                // 立即更新坐标轴和重新计算数据
                this.updateChartAxes();
                this.calculateDistributionData();
                this.updateChart();
            });
        });
        
        // 重置范围按钮
        document.getElementById('resetRange').addEventListener('click', () => {
            this.setDefaultDisplayRange();
            this.updateDisplayRangeInputs();
            this.updateChartAxes();
            this.calculateDistributionData();
            this.updateChart();
        });
        
        // 显示选项
        ['showPDF', 'showCDF', 'showMean'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateDisplayOptions();
            });
        });
        

        
        // 抽样按钮
        document.getElementById('generateSample').addEventListener('click', () => {
            this.generateSample();
        });
    }
    
    setDefaultDisplayRange() {
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
    
    updateChartAxes() {
        // 修复版本：根据分布类型创建不同的图表
        console.log(`Updating axes: xMin=${this.displayRange.xMin}, xMax=${this.displayRange.xMax}, yMax=${this.displayRange.yMax}`);
        
        // 销毁并重新创建图表以确保坐标轴正确更新
        if (this.distributionChart) {
            this.distributionChart.destroy();
        }
        
        // 判断是否为离散分布
        const isDiscrete = ['binomial', 'poisson'].includes(this.currentDistribution);
        
        // 重新创建图表
        const ctx1 = document.getElementById('distributionChart').getContext('2d');
        
        if (isDiscrete) {
            // 离散分布：使用散点图
            this.distributionChart = new Chart(ctx1, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: '概率质量函数 (PMF)',
                        data: this.chartData.xValues.map((x, i) => ({x: x, y: this.chartData.pdfValues[i]})),
                        borderColor: '#007bff',
                        backgroundColor: '#007bff',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: false
                    }, {
                        type: 'line',
                        label: '累积分布函数 (CDF)',
                        data: this.generateSteppedCDFData(),
                        borderColor: '#28a745',
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        showLine: true,
                        stepped: 'before',
                        fill: false,
                        yAxisID: 'y1',
                        hidden: !document.getElementById('showCDF').checked
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
                            title: { display: true, text: '概率质量' }
                        },
                        y1: { 
                            type: 'linear', 
                            display: document.getElementById('showCDF').checked, 
                            position: 'right', 
                            min: 0, 
                            max: 1,
                            title: { display: true, text: '累积概率' }
                        },
                        x: { 
                            type: 'linear',
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
                                    return `x = ${Math.round(context[0].parsed.x)}`;
                                },
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            // 连续分布：使用线图
            this.distributionChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: this.chartData.xValues,
                    datasets: [{
                        label: '概率密度函数 (PDF)',
                        data: this.chartData.pdfValues,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }, {
                        label: '累积分布函数 (CDF)',
                        data: this.chartData.cdfValues,
                        borderColor: '#28a745',
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        yAxisID: 'y1',
                        hidden: !document.getElementById('showCDF').checked
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
                            title: { display: true, text: isDiscrete ? '概率质量' : '概率密度' }
                        },
                        y1: { 
                            type: 'linear', 
                            display: document.getElementById('showCDF').checked, 
                            position: 'right', 
                            min: 0, 
                            max: 1,
                            title: { display: true, text: '累积概率' }
                        },
                        x: { 
                            type: 'linear',
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
                                    if (isDiscrete) {
                                        return `x = ${Math.round(context[0].parsed.x)}`;
                                    } else {
                                        return `x = ${parseFloat(context[0].label || context[0].parsed.x).toFixed(2)}`;
                                    }
                                },
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        console.log(`Chart recreated with x-axis: ${this.displayRange.xMin} to ${this.displayRange.xMax}`);
    }
    
    updateDisplayOptions() {
        const showPDF = document.getElementById('showPDF').checked;
        const showCDF = document.getElementById('showCDF').checked;
        const showMean = document.getElementById('showMean').checked;
        
        // 更新图表显示
        this.distributionChart.data.datasets[0].hidden = !showPDF;
        this.distributionChart.data.datasets[1].hidden = !showCDF;
        this.distributionChart.options.scales.y1.display = showCDF;
        
        // 添加均值线
        this.addMeanLine(showMean);
        
        this.distributionChart.update('none');
    }
    
    addMeanLine(showMean) {
        // 移除现有的均值线（保留前两个数据集：PDF/PMF和CDF）
        this.distributionChart.data.datasets = this.distributionChart.data.datasets.slice(0, 2);
        
        if (showMean) {
            const stats = this.calculateStatistics();
            const isDiscrete = ['binomial', 'poisson'].includes(this.currentDistribution);
            
            // 统一使用散点图方式创建垂直线，适用于所有分布类型
            this.distributionChart.data.datasets.push({
                type: 'line',
                label: '均值线',
                data: [{x: stats.mean, y: 0}, {x: stats.mean, y: this.displayRange.yMax}],
                borderColor: '#FF0000',
                borderWidth: 3,
                borderDash: [8, 4],
                fill: false,
                pointRadius: 0,
                showLine: true,
                tension: 0,
                order: 3 // 确保均值线在其他数据之上
            });
        }
    }
    
    updateDistribution() {
        this.createParameterControls();
        this.calculateDistributionData();
        this.updateChart();
        this.updateDisplayRangeInputs();
    }
    
    calculateDistributionData() {
        // 使用当前显示范围计算分布数据
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
        
        console.log(`Generated ${this.chartData.xValues.length} data points from ${this.displayRange.xMin} to ${this.displayRange.xMax}`);
    }
    
    generateSteppedCDFData() {
        // 为离散分布生成阶梯函数CDF数据
        const steppedData = [];
        
        // 从显示范围的最小值开始，CDF为0
        steppedData.push({x: this.displayRange.xMin, y: 0});
        
        for (let i = 0; i < this.chartData.xValues.length; i++) {
            const x = this.chartData.xValues[i];
            const cdfValue = this.chartData.cdfValues[i];
            
            // 在x点之前，CDF保持前一个值
            if (i === 0) {
                // 第一个点之前，CDF为0
                steppedData.push({x: x - 0.001, y: 0});
            } else {
                // 在当前x点之前，CDF为前一个值
                steppedData.push({x: x - 0.001, y: this.chartData.cdfValues[i-1]});
            }
            
            // 在x点处，CDF跳跃到新值
            steppedData.push({x: x, y: cdfValue});
        }
        
        // 延伸到显示范围的最大值，保持最后的CDF值
        const lastCDF = this.chartData.cdfValues[this.chartData.cdfValues.length - 1];
        steppedData.push({x: this.displayRange.xMax, y: lastCDF});
        
        console.log('Stepped CDF data:', steppedData.slice(0, 10)); // 打印前10个点用于调试
        
        return steppedData;
    }
    
    calculateSimpleCDF(x) {
        const stats = this.calculateStatistics();
        
        switch (this.currentDistribution) {
            case 'normal':
                const z = (x - stats.mean) / stats.std;
                return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
            case 'uniform':
                const a = this.parameters.a || 0;
                const b = this.parameters.b || 1;
                if (x < a) return 0;
                if (x > b) return 1;
                return (x - a) / (b - a);
            case 'exponential':
                const lambda = this.parameters.lambda || 1;
                return x < 0 ? 0 : 1 - Math.exp(-lambda * x);
            case 'binomial':
                const n = this.parameters.n || 20;
                const p = this.parameters.p || 0.5;
                let cdf = 0;
                for (let k = 0; k <= Math.floor(x); k++) {
                    if (k >= 0 && k <= n) {
                        cdf += this.binomialCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
                    }
                }
                return cdf;
            case 'poisson':
                const lambdaP = this.parameters.lambda || 3;
                let cdfPoisson = 0;
                for (let k = 0; k <= Math.floor(x); k++) {
                    if (k >= 0) {
                        cdfPoisson += (Math.pow(lambdaP, k) * Math.exp(-lambdaP)) / this.factorial(k);
                    }
                }
                return cdfPoisson;
            default:
                return 0.5;
        }
    }
    
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
                <div class="d-flex justify-content-between">
                    <small>${param.min}</small>
                    <span id="${param.name}Value" class="fw-bold">${param.value}</span>
                    <small>${param.max}</small>
                </div>
            `;
            container.appendChild(div);
            
            this.parameters[param.name] = param.value;
            
            const slider = document.getElementById(param.name);
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.parameters[param.name] = value;
                document.getElementById(`${param.name}Value`).textContent = value;
                this.calculateDistributionData();
                this.updateChart();
            });
        });
    }
    
    calculatePDF(x) {
        switch (this.currentDistribution) {
            case 'normal':
                const mean = this.parameters.mean || 0;
                const std = this.parameters.std || 1;
                return (1 / (std * Math.sqrt(2 * Math.PI))) * 
                       Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
            
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
                if (x < 0 || x > n || x !== Math.floor(x)) return 0;
                return this.binomialCoeff(n, x) * Math.pow(p, x) * Math.pow(1 - p, n - x);
            
            case 'poisson':
                const lambda = this.parameters.lambda || 3;
                if (x < 0 || x !== Math.floor(x)) return 0;
                return (Math.pow(lambda, x) * Math.exp(-lambda)) / this.factorial(x);
            
            default:
                return 0;
        }
    }
    
    binomialCoeff(n, k) {
        if (k > n) return 0;
        if (k === 0 || k === n) return 1;
        
        let result = 1;
        for (let i = 0; i < Math.min(k, n - k); i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    }
    
    factorial(n) {
        if (n <= 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }
    
    calculateStatistics() {
        switch (this.currentDistribution) {
            case 'normal':
                return {
                    mean: this.parameters.mean || 0,
                    std: this.parameters.std || 1
                };
            case 'uniform':
                const a = this.parameters.a || 0;
                const b = this.parameters.b || 1;
                return {
                    mean: (a + b) / 2,
                    std: Math.sqrt((b - a) ** 2 / 12)
                };
            case 'exponential':
                const lambda = this.parameters.lambda || 1;
                return {
                    mean: 1 / lambda,
                    std: 1 / lambda
                };
            case 'binomial':
                const n = this.parameters.n || 20;
                const p = this.parameters.p || 0.5;
                return {
                    mean: n * p,
                    std: Math.sqrt(n * p * (1 - p))
                };
            case 'poisson':
                const lambdaP = this.parameters.lambda || 3;
                return {
                    mean: lambdaP,
                    std: Math.sqrt(lambdaP)
                };
            default:
                return { mean: 0, std: 1 };
        }
    }
    
    updateChart() {
        const isDiscrete = ['binomial', 'poisson'].includes(this.currentDistribution);
        
        if (isDiscrete) {
            // 离散分布：PMF使用散点数据，CDF使用阶梯函数数据
            this.distributionChart.data.datasets[0].data = this.chartData.xValues.map((x, i) => ({
                x: x, 
                y: this.chartData.pdfValues[i]
            }));
            // CDF使用阶梯函数数据
            this.distributionChart.data.datasets[1].data = this.generateSteppedCDFData();
        } else {
            // 连续分布：使用标准数据格式
            this.distributionChart.data.labels = this.chartData.xValues;
            this.distributionChart.data.datasets[0].data = this.chartData.pdfValues;
            this.distributionChart.data.datasets[1].data = this.chartData.cdfValues;
        }
        
        this.distributionChart.update('none');
    }
    
    calculateQuantile(p) {
        // 简化的分位数计算
        const stats = this.calculateStatistics();
        
        switch (this.currentDistribution) {
            case 'normal':
                // 使用正态分布的近似分位数
                const z = this.normalQuantile(p);
                return stats.mean + z * stats.std;
            default:
                return stats.mean;
        }
    }
    
    normalQuantile(p) {
        // 正态分布分位数的近似计算
        if (p <= 0) return -Infinity;
        if (p >= 1) return Infinity;
        if (p === 0.5) return 0;
        
        const c0 = 2.515517;
        const c1 = 0.802853;
        const c2 = 0.010328;
        const d1 = 1.432788;
        const d2 = 0.189269;
        const d3 = 0.001308;
        
        let t, z;
        if (p < 0.5) {
            t = Math.sqrt(-2 * Math.log(p));
            z = -((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1);
        } else {
            t = Math.sqrt(-2 * Math.log(1 - p));
            z = ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1);
        }
        
        return z;
    }
    

    
    generateSample() {
        const sampleSizeInput = document.getElementById('sampleSize');
        const sampleSize = sampleSizeInput ? parseInt(sampleSizeInput.value) : 1000;
        const samples = [];
        
        // 生成随机样本
        for (let i = 0; i < sampleSize; i++) {
            samples.push(this.generateRandomSample());
        }
        
        // 更新散点图（显示前100个样本点以避免过于密集）
        const scatterSamples = samples.slice(0, Math.min(100, sampleSize)).map((value, index) => ({
            x: index + 1,
            y: value
        }));
        
        this.sampleScatterChart.data.datasets[0].data = scatterSamples;
        this.sampleScatterChart.update('none');
        
        // 创建直方图数据
        const isDiscrete = ['binomial', 'poisson'].includes(this.currentDistribution);
        
        if (isDiscrete) {
            // 离散分布：使用整数分组
            const min = Math.min(...samples);
            const max = Math.max(...samples);
            
            const histogram = {};
            const binLabels = [];
            
            // 为每个可能的整数值创建分组
            for (let i = min; i <= max; i++) {
                histogram[i] = 0;
                binLabels.push(i.toString());
            }
            
            // 统计每个值的频次
            samples.forEach(sample => {
                histogram[sample]++;
            });
            
            // 转换为频率数组
            const frequencies = binLabels.map(label => histogram[parseInt(label)] / sampleSize);
            
            this.sampleChart.data.labels = binLabels;
            this.sampleChart.data.datasets[0].data = frequencies;
        } else {
            // 连续分布：使用传统的分组方法
            const bins = 20;
            const min = Math.min(...samples);
            const max = Math.max(...samples);
            const binWidth = (max - min) / bins;
            
            const histogram = new Array(bins).fill(0);
            const binLabels = [];
            
            for (let i = 0; i < bins; i++) {
                const binStart = min + i * binWidth;
                binLabels.push(binStart.toFixed(2));
            }
            
            samples.forEach(sample => {
                const binIndex = Math.min(Math.floor((sample - min) / binWidth), bins - 1);
                histogram[binIndex]++;
            });
            
            // 转换为频率
            const frequencies = histogram.map(count => count / sampleSize);
            
            this.sampleChart.data.labels = binLabels;
            this.sampleChart.data.datasets[0].data = frequencies;
        }
        
        this.sampleChart.update('none');
    }
    
    generateRandomSample() {
        switch (this.currentDistribution) {
            case 'normal':
                return this.normalRandom();
            case 'uniform':
                const a = this.parameters.a || 0;
                const b = this.parameters.b || 1;
                return a + Math.random() * (b - a);
            case 'exponential':
                const lambda = this.parameters.lambda || 1;
                return -Math.log(1 - Math.random()) / lambda;
            case 'binomial':
                const n = this.parameters.n || 20;
                const p = this.parameters.p || 0.5;
                return this.binomialRandom(n, p);
            case 'poisson':
                const lambdaP = this.parameters.lambda || 3;
                return this.poissonRandom(lambdaP);
            default:
                return Math.random();
        }
    }
    
    binomialRandom(n, p) {
        // 使用逆变换方法生成二项分布随机数
        let successes = 0;
        for (let i = 0; i < n; i++) {
            if (Math.random() < p) {
                successes++;
            }
        }
        return successes;
    }
    
    poissonRandom(lambda) {
        // 使用Knuth算法生成泊松分布随机数
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        
        return k - 1;
    }
    
    normalRandom() {
        const mean = this.parameters.mean || 0;
        const std = this.parameters.std || 1;
        
        // Box-Muller变换
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return z * std + mean;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new ProbabilityDistributionVisualizer();
});