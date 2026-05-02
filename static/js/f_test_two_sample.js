class FTestTwoSampleSimulator {
    constructor() {
        this.chart = null;
        this.sample1 = [];
        this.sample2 = [];
        this.testResults = null;
        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: [],
            fStats: []
        };
        
        // 设置全局引用供插件使用
        window.fTestSimulator = this;
        
        // 确保DOM元素存在后再初始化
        if (document.getElementById('distributionChart')) {
            this.setupEventListeners();
            this.updateHypotheses();
            this.initializeChart();
        } else {
            console.error('Canvas element not found');
        }
        
        // F分布临界值表 (α = 0.05, 双侧检验)
        this.fCriticalTable = {
            0.05: {
                1: [161.4, 199.5, 215.7, 224.6, 230.2, 234.0, 236.8, 238.9, 240.5, 241.9],
                2: [18.51, 19.00, 19.16, 19.25, 19.30, 19.33, 19.35, 19.37, 19.38, 19.40],
                3: [10.13, 9.55, 9.28, 9.12, 9.01, 8.94, 8.89, 8.85, 8.81, 8.79],
                4: [7.71, 6.94, 6.59, 6.39, 6.26, 6.16, 6.09, 6.04, 6.00, 5.96],
                5: [6.61, 5.79, 5.41, 5.19, 5.05, 4.95, 4.88, 4.82, 4.77, 4.74],
                10: [4.96, 4.10, 3.71, 3.48, 3.33, 3.22, 3.14, 3.07, 3.02, 2.98],
                15: [4.54, 3.68, 3.29, 3.06, 2.90, 2.79, 2.71, 2.64, 2.59, 2.54],
                20: [4.35, 3.49, 3.10, 2.87, 2.71, 2.60, 2.51, 2.45, 2.39, 2.35],
                30: [4.17, 3.32, 2.92, 2.69, 2.53, 2.42, 2.33, 2.27, 2.21, 2.16],
                60: [4.00, 3.15, 2.76, 2.53, 2.37, 2.25, 2.17, 2.10, 2.04, 1.99],
                120: [3.92, 3.07, 2.68, 2.45, 2.29, 2.17, 2.09, 2.02, 1.96, 1.91]
            },
            0.01: {
                1: [4052, 4999, 5403, 5625, 5764, 5859, 5928, 5981, 6022, 6056],
                2: [98.50, 99.00, 99.17, 99.25, 99.30, 99.33, 99.36, 99.37, 99.39, 99.40],
                3: [34.12, 30.82, 29.46, 28.71, 28.24, 27.91, 27.67, 27.49, 27.35, 27.23],
                4: [21.20, 18.00, 16.69, 15.98, 15.52, 15.21, 14.98, 14.80, 14.66, 14.55],
                5: [16.26, 13.27, 12.06, 11.39, 10.97, 10.67, 10.46, 10.29, 10.16, 10.05],
                10: [10.04, 7.56, 6.55, 5.99, 5.64, 5.39, 5.20, 5.06, 4.94, 4.85],
                15: [8.68, 6.36, 5.42, 4.89, 4.56, 4.32, 4.14, 4.00, 3.89, 3.80],
                20: [8.10, 5.85, 4.94, 4.43, 4.10, 3.87, 3.70, 3.56, 3.46, 3.37],
                30: [7.56, 5.39, 4.51, 4.02, 3.70, 3.47, 3.30, 3.17, 3.07, 2.98],
                60: [7.08, 4.98, 4.13, 3.65, 3.34, 3.12, 2.95, 2.82, 2.72, 2.63],
                120: [6.85, 4.79, 3.95, 3.48, 3.17, 2.96, 2.79, 2.66, 2.56, 2.47]
            }
        };
    }

    // 设置事件监听器
    setupEventListeners() {
        document.getElementById('runTest').addEventListener('click', () => this.runTest());
        document.getElementById('runSimulation').addEventListener('click', () => this.runSimulation());
        document.getElementById('resetSimulation').addEventListener('click', () => this.resetSimulation());
        
        // 参数变化时更新显示
        ['testType'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateHypotheses();
                this.updateChart();
            });
        });
        
        // 其他参数变化时更新图表
        ['sampleSize1', 'sampleSize2', 'significanceLevel'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateChart();
            });
        });
    }

    // 生成正态分布随机数 (Box-Muller变换)
    generateNormal(mean = 0, variance = 1) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + Math.sqrt(variance) * z0;
    }

    // 生成新样本
    generateNewSample() {
        const n1 = parseInt(document.getElementById('sampleSize1').value);
        const n2 = parseInt(document.getElementById('sampleSize2').value);
        const var1 = parseFloat(document.getElementById('populationVar1').value);
        const var2 = parseFloat(document.getElementById('populationVar2').value);

        // 生成样本1
        this.sample1 = [];
        for (let i = 0; i < n1; i++) {
            this.sample1.push(this.generateNormal(0, var1));
        }

        // 生成样本2
        this.sample2 = [];
        for (let i = 0; i < n2; i++) {
            this.sample2.push(this.generateNormal(0, var2));
        }

        // 清除之前的结果
        this.testResults = null;
        
        // 初始化结果容器
        document.getElementById('resultsContainer').innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                点击"生成样本并执行检验"开始分析
            </div>
        `;
    }

    // 计算样本方差
    calculateSampleVariance(sample) {
        const n = sample.length;
        const mean = sample.reduce((sum, x) => sum + x, 0) / n;
        const variance = sample.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
        return variance;
    }

    // 计算F分布概率密度函数 (简化版本)
    fDistributionPDF(x, df1, df2) {
        if (x <= 0) return 0;
        if (x > 10) return 0;
        
        try {
            // 使用对数计算避免数值溢出
            const logNumerator = (df1/2) * Math.log(df1/df2) + (df1/2 - 1) * Math.log(x);
            const logDenominator = this.logBeta(df1/2, df2/2) + ((df1 + df2)/2) * Math.log(1 + (df1/df2) * x);
            
            const result = Math.exp(logNumerator - logDenominator);
            return isNaN(result) || !isFinite(result) ? 0 : result;
        } catch (e) {
            return 0;
        }
    }

    // Beta函数近似计算
    betaFunction(a, b) {
        return this.gammaFunction(a) * this.gammaFunction(b) / this.gammaFunction(a + b);
    }

    // 对数Beta函数计算
    logBeta(a, b) {
        return this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
    }

    // 对数Gamma函数计算
    logGamma(z) {
        if (z < 0.5) {
            return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - this.logGamma(1 - z);
        }
        z -= 1;
        let x = 0.99999999999980993;
        const coefficients = [
            676.5203681218851, -1259.1392167224028, 771.32342877765313,
            -176.61502916214059, 12.507343278686905, -0.13857109526572012,
            9.9843695780195716e-6, 1.5056327351493116e-7
        ];
        
        for (let i = 0; i < coefficients.length; i++) {
            x += coefficients[i] / (z + i + 1);
        }
        
        const t = z + coefficients.length - 0.5;
        return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
    }

    // Gamma函数近似计算 (Stirling近似)
    gammaFunction(z) {
        if (z < 0.5) {
            return Math.PI / (Math.sin(Math.PI * z) * this.gammaFunction(1 - z));
        }
        z -= 1;
        let x = 0.99999999999980993;
        const coefficients = [
            676.5203681218851, -1259.1392167224028, 771.32342877765313,
            -176.61502916214059, 12.507343278686905, -0.13857109526572012,
            9.9843695780195716e-6, 1.5056327351493116e-7
        ];
        
        for (let i = 0; i < coefficients.length; i++) {
            x += coefficients[i] / (z + i + 1);
        }
        
        const t = z + coefficients.length - 0.5;
        return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }

    // 获取F分布临界值
    getFCriticalValue(alpha, df1, df2) {
        // 简化的临界值查找
        const table = this.fCriticalTable[alpha];
        if (!table) return null;

        // 找到最接近的自由度
        const availableDf1 = Object.keys(table).map(Number).sort((a, b) => a - b);
        const closestDf1 = availableDf1.reduce((prev, curr) => 
            Math.abs(curr - df1) < Math.abs(prev - df1) ? curr : prev
        );

        const row = table[closestDf1];
        if (!row) return null;

        // df2对应的列索引 (1, 2, 3, 4, 5, 10, 15, 20, 30, 60, 120对应索引0-10)
        const df2Mapping = [1, 2, 3, 4, 5, 10, 15, 20, 30, 60, 120];
        let closestIndex = 0;
        let minDiff = Math.abs(df2Mapping[0] - df2);
        
        for (let i = 1; i < df2Mapping.length; i++) {
            const diff = Math.abs(df2Mapping[i] - df2);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }

        return row[closestIndex];
    }

    // 计算F分布累积分布函数 (近似)
    fDistributionCDF(x, df1, df2) {
        if (x <= 0) return 0;
        if (x >= 100) return 1;

        // 使用数值积分近似计算CDF
        const step = x / 1000;
        let sum = 0;
        
        for (let i = step; i <= x; i += step) {
            sum += this.fDistributionPDF(i, df1, df2) * step;
        }
        
        return Math.min(sum, 1);
    }

    // 运行F检验
    runTest() {
        // 每次都生成新样本
        this.generateNewSample();

        const n1 = this.sample1.length;
        const n2 = this.sample2.length;
        const s1Squared = this.calculateSampleVariance(this.sample1);
        const s2Squared = this.calculateSampleVariance(this.sample2);
        
        const alpha = parseFloat(document.getElementById('significanceLevel').value);
        const testType = document.getElementById('testType').value;

        // 计算F统计量
        const fStatistic = s1Squared / s2Squared;
        const df1 = n1 - 1;
        const df2 = n2 - 1;

        // 计算p值
        let pValue;
        if (testType === 'two-tailed') {
            const cdf = this.fDistributionCDF(fStatistic, df1, df2);
            pValue = 2 * Math.min(cdf, 1 - cdf);
        } else if (testType === 'right-tailed') {
            pValue = 1 - this.fDistributionCDF(fStatistic, df1, df2);
        } else { // left-tailed
            pValue = this.fDistributionCDF(fStatistic, df1, df2);
        }

        // 获取临界值
        const fCritical = this.getFCriticalValue(alpha, df1, df2);

        // 判断是否拒绝原假设
        let rejectH0;
        if (testType === 'two-tailed') {
            rejectH0 = pValue < alpha;
        } else if (testType === 'right-tailed') {
            rejectH0 = fStatistic > fCritical;
        } else { // left-tailed
            rejectH0 = fStatistic < (1 / fCritical);
        }

        this.testResults = {
            n1, n2, s1Squared, s2Squared, fStatistic, df1, df2,
            pValue, alpha, fCritical, rejectH0, testType
        };

        this.displayResults();
        this.updateChart();
        this.markTestStatisticOnChart(fStatistic);
    }

    // 显示检验结果
    displayResults() {
        const r = this.testResults;
        const mean1 = this.sample1.reduce((sum, x) => sum + x, 0) / this.sample1.length;
        const mean2 = this.sample2.reduce((sum, x) => sum + x, 0) / this.sample2.length;
        const s1 = Math.sqrt(r.s1Squared);
        const s2 = Math.sqrt(r.s2Squared);

        const resultClass = r.rejectH0 ? 'alert-danger' : 'alert-success';
        const conclusion = r.rejectH0 ? '拒绝原假设' : '接受原假设';
        const interpretation = r.rejectH0 ? 
            '有足够证据表明两总体方差不相等' : 
            '没有足够证据表明两总体方差不相等';

        document.getElementById('resultsContainer').innerHTML = `
            <table class="table results-table mb-3">
                <thead>
                    <tr>
                        <th colspan="3">样本统计量</th>
                        <th colspan="3">检验统计量</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>样本1均值</strong><br>${mean1.toFixed(4)}</td>
                        <td><strong>样本1标准差</strong><br>${s1.toFixed(4)}</td>
                        <td><strong>样本1方差</strong><br>s₁² = ${r.s1Squared.toFixed(4)}</td>
                        <td><strong>F统计量</strong><br>${r.fStatistic.toFixed(4)}</td>
                        <td><strong>自由度</strong><br>df₁=${r.df1}, df₂=${r.df2}</td>
                        <td><strong>方差比</strong><br>s₁²/s₂² = ${r.fStatistic.toFixed(4)}</td>
                    </tr>
                    <tr>
                        <td><strong>样本2均值</strong><br>${mean2.toFixed(4)}</td>
                        <td><strong>样本2标准差</strong><br>${s2.toFixed(4)}</td>
                        <td><strong>样本2方差</strong><br>s₂² = ${r.s2Squared.toFixed(4)}</td>
                        <td><strong>p值</strong><br>${r.pValue.toFixed(6)}</td>
                        <td><strong>显著性水平</strong><br>α = ${r.alpha}</td>
                        <td><strong>临界值</strong><br>F₍${r.alpha}₎ ≈ ${r.fCritical ? r.fCritical.toFixed(4) : 'N/A'}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="alert ${resultClass}">
                <h6><i class="fas fa-gavel me-2"></i>检验结论</h6>
                <p class="mb-1"><strong>${conclusion}</strong> (p = ${r.pValue.toFixed(6)} ${r.pValue < r.alpha ? '<' : '≥'} α = ${r.alpha})</p>
                <p class="mb-0">${interpretation}</p>
            </div>
        `;
    }

    // 更新假设
    updateHypotheses() {
        const testType = document.getElementById('testType').value;
        const alternativeHypothesis = document.getElementById('alternativeHypothesis');
        const decisionRule = document.getElementById('decisionRule');

        switch (testType) {
            case 'two-tailed':
                alternativeHypothesis.textContent = 'σ₁² ≠ σ₂² (两总体方差不等)';
                decisionRule.textContent = '当p < α时拒绝H₀';
                break;
            case 'right-tailed':
                alternativeHypothesis.textContent = 'σ₁² > σ₂² (总体1方差大于总体2方差)';
                decisionRule.textContent = '当F > F₍α₎时拒绝H₀';
                break;
            case 'left-tailed':
                alternativeHypothesis.textContent = 'σ₁² < σ₂² (总体1方差小于总体2方差)';
                decisionRule.textContent = '当F < F₍1-α₎时拒绝H₀';
                break;
        }
    }

    // 初始化图表
    initializeChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'F分布密度',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }, {
                    label: '拒绝域',
                    data: [],
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.3)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'F值'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '概率密度'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            },
            plugins: [{
                id: 'testStatisticLine',
                afterDraw: (chart) => {
                    const fValue = chart.testStatisticPosition;
                    if (!fValue) return;
                    
                    const { ctx, chartArea, scales } = chart;
                    if (!chartArea || !scales.x || !scales.y) return;
                    
                    // 使用缓存避免重复计算
                    if (!chart.cachedIndex || chart.cachedValue !== fValue) {
                        const labels = chart.data.labels;
                        let closestIndex = 0;
                        let minDiff = Math.abs(parseFloat(labels[0]) - fValue);
                        
                        for (let i = 1; i < labels.length; i++) {
                            const diff = Math.abs(parseFloat(labels[i]) - fValue);
                            if (diff < minDiff) {
                                minDiff = diff;
                                closestIndex = i;
                            }
                        }
                        
                        chart.cachedIndex = closestIndex;
                        chart.cachedValue = fValue;
                    }
                    
                    const xPosition = scales.x.getPixelForValue(chart.cachedIndex);
                    
                    // 绘制垂直线
                    ctx.save();
                    ctx.strokeStyle = '#ffc107';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(xPosition, chartArea.bottom);
                    ctx.lineTo(xPosition, chartArea.top);
                    ctx.stroke();
                    
                    // 添加文本标签
                    const simulator = window.fTestSimulator;
                    if (simulator && simulator.testResults) {
                        const yValue = simulator.fDistributionPDF(fValue, simulator.testResults.df1, simulator.testResults.df2);
                        const yPosition = scales.y.getPixelForValue(yValue);
                        
                        ctx.fillStyle = '#333';
                        ctx.font = '12px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(`F = ${fValue.toFixed(3)}`, 
                                   xPosition, yPosition - 15);
                    }
                    
                    ctx.restore();
                }
            }]
        });

        // 初始化测试统计量位置
        this.chart.testStatisticPosition = null;

        // 立即更新图表以显示初始F分布曲线
        setTimeout(() => {
            this.updateChart();
        }, 100);
    }

    // 更新图表
    updateChart() {
        if (!this.chart) return;

        const n1 = parseInt(document.getElementById('sampleSize1').value);
        const n2 = parseInt(document.getElementById('sampleSize2').value);
        const df1 = n1 - 1;
        const df2 = n2 - 1;
        const alpha = parseFloat(document.getElementById('significanceLevel').value);
        const testType = document.getElementById('testType').value;

        // 检查参数是否改变，避免不必要的重绘
        const currentParams = `${n1}-${n2}-${alpha}-${testType}`;
        if (this.chart.lastParams === currentParams && this.chart.data.labels.length > 0) {
            return;
        }

        // 生成F分布曲线数据
        const xValues = [];
        const yValues = [];
        const rejectionValues = [];
        
        const maxX = 5;
        const step = maxX / 200;
        
        for (let x = 0.01; x <= maxX; x += step) {
            xValues.push(x.toFixed(3));
            const y = this.fDistributionPDF(x, df1, df2);
            yValues.push(y);
            
            // 确定拒绝域
            const fCritical = this.getFCriticalValue(alpha, df1, df2) || 2.5;
            let inRejectionRegion = false;
            
            if (testType === 'two-tailed') {
                inRejectionRegion = x > fCritical || x < (1 / fCritical);
            } else if (testType === 'right-tailed') {
                inRejectionRegion = x > fCritical;
            } else { // left-tailed
                inRejectionRegion = x < (1 / fCritical);
            }
            
            rejectionValues.push(inRejectionRegion ? y : null);
        }

        // 更新图表数据
        this.chart.data.labels = xValues;
        this.chart.data.datasets[0].data = yValues;
        this.chart.data.datasets[1].data = rejectionValues;

        // 缓存参数
        this.chart.lastParams = currentParams;

        // 如果有检验结果，设置F统计量位置
        if (this.testResults) {
            this.chart.testStatisticPosition = this.testResults.fStatistic;
        }

        // 使用 'none' 动画模式提高性能
        this.chart.update('none');
    }

    // 在图表上标记检验统计量
    markTestStatisticOnChart(fStatistic) {
        if (!this.chart) return;

        // 设置检验统计量位置，插件会使用这个值来绘制垂直线
        this.chart.testStatisticPosition = fStatistic;
        
        // 更新图表以触发插件重绘
        this.chart.update();
    }

    // 运行重复模拟
    runSimulation() {
        const iterations = 1000;
        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: [],
            fStats: []
        };

        // 清除之前的模拟结果
        const existingResults = document.querySelector('.alert-info');
        if (existingResults && existingResults.innerHTML.includes('模拟结果')) {
            existingResults.remove();
        }

        document.getElementById('simulationStatus').textContent = '运行中...';

        // 使用setTimeout来避免阻塞UI
        let completed = 0;
        const runBatch = () => {
            const batchSize = 50;
            for (let i = 0; i < batchSize && completed < iterations; i++) {
                this.runSingleTest();
                completed++;
            }

            const progress = Math.round((completed / iterations) * 100);
            document.getElementById('simulationStatus').textContent = `运行中... ${progress}%`;

            if (completed < iterations) {
                setTimeout(runBatch, 10);
            } else {
                this.updateSimulationResults();
                document.getElementById('simulationStatus').textContent = '完成';
            }
        };

        runBatch();
    }

    // 运行单次检验（用于模拟）
    runSingleTest() {
        const n1 = parseInt(document.getElementById('sampleSize1').value);
        const n2 = parseInt(document.getElementById('sampleSize2').value);
        const var1 = parseFloat(document.getElementById('populationVar1').value);
        const var2 = parseFloat(document.getElementById('populationVar2').value);
        const alpha = parseFloat(document.getElementById('significanceLevel').value);
        const testType = document.getElementById('testType').value;

        // 生成样本
        const sample1 = [];
        const sample2 = [];
        
        for (let i = 0; i < n1; i++) {
            sample1.push(this.generateNormal(0, var1));
        }
        
        for (let i = 0; i < n2; i++) {
            sample2.push(this.generateNormal(0, var2));
        }

        // 计算统计量
        const s1Squared = this.calculateSampleVariance(sample1);
        const s2Squared = this.calculateSampleVariance(sample2);
        const fStatistic = s1Squared / s2Squared;
        const df1 = n1 - 1;
        const df2 = n2 - 1;

        // 计算p值
        let pValue;
        if (testType === 'two-tailed') {
            const cdf = this.fDistributionCDF(fStatistic, df1, df2);
            pValue = 2 * Math.min(cdf, 1 - cdf);
        } else if (testType === 'right-tailed') {
            pValue = 1 - this.fDistributionCDF(fStatistic, df1, df2);
        } else { // left-tailed
            pValue = this.fDistributionCDF(fStatistic, df1, df2);
        }

        // 记录结果
        this.simulationResults.totalTests++;
        this.simulationResults.pValues.push(pValue);
        this.simulationResults.fStats.push(fStatistic);
        
        if (pValue < alpha) {
            this.simulationResults.rejections++;
        }
    }

    // 更新模拟结果显示
    updateSimulationResults() {
        const rejectionRate = (this.simulationResults.rejections / this.simulationResults.totalTests * 100).toFixed(2);
        const alpha = parseFloat(document.getElementById('significanceLevel').value);
        const expectedRate = (alpha * 100).toFixed(2);

        const avgPValue = (this.simulationResults.pValues.reduce((sum, p) => sum + p, 0) / this.simulationResults.pValues.length).toFixed(4);
        const avgFStat = (this.simulationResults.fStats.reduce((sum, f) => sum + f, 0) / this.simulationResults.fStats.length).toFixed(4);

        // 计算检验功效
        const var1 = parseFloat(document.getElementById('populationVar1').value);
        const var2 = parseFloat(document.getElementById('populationVar2').value);
        const isH0True = Math.abs(var1 - var2) < 0.001;
        
        let powerInfo = '';
        if (isH0True) {
            powerInfo = `
                <strong>第一类错误率:</strong> ${rejectionRate}% (理论值: ${expectedRate}%)<br>
                <strong>检验功效:</strong> 不适用 (H₀为真)
            `;
        } else {
            powerInfo = `
                <strong>检验功效:</strong> ${rejectionRate}%<br>
                <strong>第二类错误率:</strong> ${(100 - parseFloat(rejectionRate)).toFixed(2)}%
            `;
        }

        const simulationResultsHTML = `
            <div class="alert alert-info mt-3">
                <h6><i class="fas fa-chart-bar me-2"></i>模拟结果 (${this.simulationResults.totalTests}次)</h6>
                <div class="row">
                    <div class="col-md-6">
                        <strong>拒绝H₀次数:</strong> ${this.simulationResults.rejections}<br>
                        <strong>拒绝率:</strong> ${rejectionRate}%<br>
                        ${powerInfo}
                    </div>
                    <div class="col-md-6">
                        <strong>平均p值:</strong> ${avgPValue}<br>
                        <strong>平均F统计量:</strong> ${avgFStat}<br>
                        <strong>总体1方差:</strong> ${var1}<br>
                        <strong>总体2方差:</strong> ${var2}
                    </div>
                </div>
                <div class="mt-2">
                    <small class="text-muted">
                        ${isH0True ? 
                          (Math.abs(parseFloat(rejectionRate) - parseFloat(expectedRate)) < 2 ? 
                            '✓ 第一类错误率接近理论值，模拟结果正常' : 
                            '⚠ 第一类错误率偏离理论值较大') :
                          `✓ 检验功效: ${rejectionRate}% (总体1方差${var1 > var2 ? '大于' : '小于'}总体2方差)`}
                    </small>
                </div>
            </div>
        `;

        document.getElementById('resultsContainer').innerHTML += simulationResultsHTML;
    }

    // 重置模拟
    resetSimulation() {
        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: [],
            fStats: []
        };

        document.getElementById('simulationStatus').textContent = '就绪';
        
        // 移除模拟结果显示
        const simulationResults = document.querySelector('.alert-info');
        if (simulationResults && simulationResults.innerHTML.includes('模拟结果')) {
            simulationResults.remove();
        }
    }
}