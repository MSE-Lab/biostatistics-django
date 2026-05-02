class ChiSquareVarianceTestSimulator {
    constructor() {
        this.chart = null;
        this.sample = [];
        this.testResults = null;
        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: [],
            chiSquareStats: []
        };
        
        // 设置全局引用供插件使用
        window.chiSquareSimulator = this;
        
        // 初始化
        this.updateHypotheses();
        this.initializeChart();
        this.setupEventListeners();
    }

    // 设置事件监听器
    setupEventListeners() {
        // 按钮事件
        document.getElementById('runTest').addEventListener('click', () => this.runTest());
        document.getElementById('runSimulation').addEventListener('click', () => this.runSimulation());
        document.getElementById('resetSimulation').addEventListener('click', () => this.resetSimulation());
        
        // 参数变化监听
        document.getElementById('testType').addEventListener('change', () => this.updateHypotheses());
        document.getElementById('sigma0Squared').addEventListener('input', () => this.updateHypotheses());
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
        const n = parseInt(document.getElementById('sampleSize').value);
        const trueMu = parseFloat(document.getElementById('trueMu').value);
        const trueSigmaSquared = parseFloat(document.getElementById('trueSigmaSquared').value);

        // 生成样本
        this.sample = [];
        for (let i = 0; i < n; i++) {
            this.sample.push(this.generateNormal(trueMu, trueSigmaSquared));
        }

        // 清除之前的结果
        this.testResults = null;

        // 更新图表
        this.updateChart();
    }

    // 计算样本方差
    calculateSampleVariance(sample) {
        const n = sample.length;
        const mean = sample.reduce((sum, x) => sum + x, 0) / n;
        const variance = sample.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
        return variance;
    }

    // 计算卡方分布概率密度函数
    chiSquarePDF(x, df) {
        if (x <= 0) return 0;
        
        const gamma = this.gammaFunction(df / 2);
        const numerator = Math.pow(x, df/2 - 1) * Math.exp(-x/2);
        const denominator = Math.pow(2, df/2) * gamma;
        
        return numerator / denominator;
    }

    // Gamma函数近似计算 (优化版本，添加缓存)
    gammaFunction(z) {
        // 添加缓存以提高性能
        if (!this.gammaCache) {
            this.gammaCache = new Map();
        }
        
        const key = z.toFixed(6);
        if (this.gammaCache.has(key)) {
            return this.gammaCache.get(key);
        }
        
        let result;
        if (z < 0.5) {
            result = Math.PI / (Math.sin(Math.PI * z) * this.gammaFunction(1 - z));
        } else {
            const zMinus1 = z - 1;
            let x = 0.99999999999980993;
            const coefficients = [
                676.5203681218851, -1259.1392167224028, 771.32342877765313,
                -176.61502916214059, 12.507343278686905, -0.13857109526572012,
                9.9843695780195716e-6, 1.5056327351493116e-7
            ];
            
            for (let i = 0; i < coefficients.length; i++) {
                x += coefficients[i] / (zMinus1 + i + 1);
            }
            
            const t = zMinus1 + coefficients.length - 0.5;
            result = Math.sqrt(2 * Math.PI) * Math.pow(t, zMinus1 + 0.5) * Math.exp(-t) * x;
        }
        
        // 缓存结果，但限制缓存大小
        if (this.gammaCache.size < 1000) {
            this.gammaCache.set(key, result);
        }
        
        return result;
    }

    // 计算卡方分布累积分布函数 (近似)
    chiSquareCDF(x, df) {
        if (x <= 0) return 0;
        if (x >= 100) return 1;

        // 使用数值积分近似计算CDF
        const step = x / 1000;
        let sum = 0;
        
        for (let i = step; i <= x; i += step) {
            sum += this.chiSquarePDF(i, df) * step;
        }
        
        return Math.min(sum, 1);
    }

    // 获取卡方分布临界值 (简化版)
    getChiSquareCriticalValue(alpha, df) {
        // 简化的临界值表 (α = 0.05)
        const criticalTable = {
            0.05: [3.84, 5.99, 7.81, 9.49, 11.07, 12.59, 14.07, 15.51, 16.92, 18.31,
                   19.68, 21.03, 22.36, 23.68, 24.99, 26.30, 27.59, 28.87, 30.14, 31.41],
            0.01: [6.63, 9.21, 11.34, 13.28, 15.09, 16.81, 18.48, 20.09, 21.67, 23.21,
                   24.72, 26.22, 27.69, 29.14, 30.58, 32.00, 33.41, 34.81, 36.19, 37.57]
        };
        
        if (criticalTable[alpha] && df >= 1 && df <= 20) {
            return criticalTable[alpha][df - 1];
        }
        
        // 近似公式
        if (alpha === 0.05) {
            return df + 1.96 * Math.sqrt(2 * df);
        } else if (alpha === 0.01) {
            return df + 2.58 * Math.sqrt(2 * df);
        }
        
        return df + 1.96 * Math.sqrt(2 * df);
    }

    // 运行卡方检验
    runTest() {
        // 每次都生成新样本
        this.generateNewSample();

        const n = this.sample.length;
        const sigma0Squared = parseFloat(document.getElementById('sigma0Squared').value);
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;

        // 计算样本统计量
        const sampleMean = this.sample.reduce((sum, x) => sum + x, 0) / n;
        const sampleVariance = this.calculateSampleVariance(this.sample);
        const sampleStd = Math.sqrt(sampleVariance);

        // 计算卡方统计量
        const chiSquareStatistic = (n - 1) * sampleVariance / sigma0Squared;
        const df = n - 1;

        // 计算p值
        let pValue;
        if (testType === 'two-tailed') {
            const cdf = this.chiSquareCDF(chiSquareStatistic, df);
            pValue = 2 * Math.min(cdf, 1 - cdf);
        } else if (testType === 'right-tailed') {
            pValue = 1 - this.chiSquareCDF(chiSquareStatistic, df);
        } else { // left-tailed
            pValue = this.chiSquareCDF(chiSquareStatistic, df);
        }

        // 获取临界值
        const criticalValue = this.getChiSquareCriticalValue(alpha, df);

        // 判断是否拒绝原假设
        const rejectH0 = pValue < alpha;

        this.testResults = {
            n, sampleMean, sampleVariance, sampleStd, chiSquareStatistic, df,
            pValue, alpha, criticalValue, rejectH0, testType, sigma0Squared
        };

        this.displayResults();
        this.updateChart();
    }

    // 显示检验结果
    displayResults() {
        const r = this.testResults;

        const resultClass = r.rejectH0 ? 'alert-danger' : 'alert-success';
        const conclusion = r.rejectH0 ? '拒绝原假设' : '接受原假设';
        const interpretation = r.rejectH0 ? 
            '有足够证据表明总体方差不等于假设值' : 
            '没有足够证据表明总体方差不等于假设值';

        document.getElementById('resultsContainer').innerHTML = `
            <table class="table results-table mb-3">
                <thead>
                    <tr>
                        <th colspan="2">样本统计量</th>
                        <th colspan="2">检验统计量</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>样本均值</strong><br>${r.sampleMean.toFixed(4)}</td>
                        <td><strong>样本标准差</strong><br>${r.sampleStd.toFixed(4)}</td>
                        <td><strong>χ²统计量</strong><br>${r.chiSquareStatistic.toFixed(4)}</td>
                        <td><strong>自由度</strong><br>df = ${r.df}</td>
                    </tr>
                    <tr>
                        <td><strong>样本方差</strong><br>${r.sampleVariance.toFixed(4)}</td>
                        <td><strong>样本大小</strong><br>n = ${r.n}</td>
                        <td><strong>p值</strong><br>${r.pValue.toFixed(6)}</td>
                        <td><strong>显著性水平</strong><br>α = ${r.alpha}</td>
                    </tr>
                    <tr>
                        <td colspan="2"><strong>临界值</strong><br>χ²₍${r.alpha}₎ ≈ ${r.criticalValue.toFixed(4)}</td>
                        <td colspan="2"><strong>检验结论</strong><br>${r.rejectH0 ? '<span class="text-danger">拒绝H₀</span>' : '<span class="text-success">接受H₀</span>'}</td>
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
        const sigma0Squared = parseFloat(document.getElementById('sigma0Squared').value);
        const alternativeHypothesis = document.getElementById('alternativeHypothesis');
        const decisionRule = document.getElementById('decisionRule');

        switch (testType) {
            case 'two-tailed':
                alternativeHypothesis.textContent = `σ² ≠ ${sigma0Squared} (总体方差不等于假设值)`;
                decisionRule.textContent = '当p < α时拒绝H₀';
                break;
            case 'right-tailed':
                alternativeHypothesis.textContent = `σ² > ${sigma0Squared} (总体方差大于假设值)`;
                decisionRule.textContent = '当χ² > χ²₍α₎时拒绝H₀';
                break;
            case 'left-tailed':
                alternativeHypothesis.textContent = `σ² < ${sigma0Squared} (总体方差小于假设值)`;
                decisionRule.textContent = '当χ² < χ²₍1-α₎时拒绝H₀';
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
                    label: 'χ²分布密度',
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
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'χ²值'
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
                id: 'verticalLine',
                afterDraw: (chart) => {
                    // 只在有检验统计量时才绘制
                    if (chart.testStatisticPosition === null || chart.testStatisticPosition === undefined) {
                        return;
                    }
                    
                    const ctx = chart.ctx;
                    const chartArea = chart.chartArea;
                    const scales = chart.scales;
                    const chiSquareValue = chart.testStatisticPosition;
                    
                    // 使用缓存的索引位置，避免重复计算
                    if (!chart.cachedIndex || chart.cachedValue !== chiSquareValue) {
                        const labels = chart.data.labels;
                        let closestIndex = 0;
                        let minDiff = Math.abs(parseFloat(labels[0]) - chiSquareValue);
                        
                        for (let i = 1; i < labels.length; i++) {
                            const diff = Math.abs(parseFloat(labels[i]) - chiSquareValue);
                            if (diff < minDiff) {
                                minDiff = diff;
                                closestIndex = i;
                            }
                        }
                        
                        chart.cachedIndex = closestIndex;
                        chart.cachedValue = chiSquareValue;
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
                    const simulator = window.chiSquareSimulator;
                    if (simulator && simulator.testResults) {
                        const yValue = simulator.chiSquarePDF(chiSquareValue, simulator.testResults.df);
                        const yPosition = scales.y.getPixelForValue(yValue);
                        
                        ctx.fillStyle = '#333';
                        ctx.font = '12px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(`χ² = ${chiSquareValue.toFixed(3)}`, 
                                   xPosition, yPosition - 15);
                    }
                    
                    ctx.restore();
                }
            }]
        });

        // 初始化测试统计量位置
        this.chart.testStatisticPosition = null;

        this.updateChart();
    }

    // 更新图表
    updateChart() {
        if (!this.chart) return;

        const n = parseInt(document.getElementById('sampleSize').value);
        const df = n - 1;
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;

        // 检查是否需要重新计算数据（参数是否改变）
        const currentParams = `${df}-${alpha}-${testType}`;
        if (this.chart.lastParams === currentParams && !this.testResults) {
            return; // 参数未改变且没有新的检验结果，跳过更新
        }

        // 生成卡方分布曲线数据
        const xValues = [];
        const yValues = [];
        const rejectionValues = [];
        
        const maxX = Math.max(30, df + 3 * Math.sqrt(2 * df));
        const step = maxX / 200;
        
        for (let x = 0.1; x <= maxX; x += step) {
            xValues.push(x.toFixed(3));
            const y = this.chiSquarePDF(x, df);
            yValues.push(y);
            
            // 确定拒绝域
            const criticalValue = this.getChiSquareCriticalValue(alpha, df);
            let inRejectionRegion = false;
            
            if (testType === 'two-tailed') {
                inRejectionRegion = x > criticalValue || x < (df - 1.96 * Math.sqrt(2 * df));
            } else if (testType === 'right-tailed') {
                inRejectionRegion = x > criticalValue;
            } else { // left-tailed
                inRejectionRegion = x < (df - 1.96 * Math.sqrt(2 * df));
            }
            
            rejectionValues.push(inRejectionRegion ? y : null);
        }

        // 更新图表数据
        this.chart.data.labels = xValues;
        this.chart.data.datasets[0].data = yValues;
        this.chart.data.datasets[1].data = rejectionValues;

        // 如果有检验结果，添加卡方统计量标记
        if (this.testResults) {
            this.markTestStatisticOnChart(this.testResults.chiSquareStatistic, df);
        }

        // 缓存参数
        this.chart.lastParams = currentParams;
        
        // 使用 'none' 动画模式提高性能
        this.chart.update('none');
    }

    // 在图表上标记检验统计量
    markTestStatisticOnChart(chiSquareStatistic, df) {
        if (!this.chart) return;

        // 设置检验统计量位置，插件会使用这个值来绘制垂直线
        this.chart.testStatisticPosition = chiSquareStatistic;
        
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
            chiSquareStats: []
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
        const n = parseInt(document.getElementById('sampleSize').value);
        const trueMu = parseFloat(document.getElementById('trueMu').value);
        const trueSigmaSquared = parseFloat(document.getElementById('trueSigmaSquared').value);
        const sigma0Squared = parseFloat(document.getElementById('sigma0Squared').value);
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;

        // 生成样本
        const sample = [];
        for (let i = 0; i < n; i++) {
            sample.push(this.generateNormal(trueMu, trueSigmaSquared));
        }

        // 计算统计量
        const sampleVariance = this.calculateSampleVariance(sample);
        const chiSquareStatistic = (n - 1) * sampleVariance / sigma0Squared;
        const df = n - 1;

        // 计算p值
        let pValue;
        if (testType === 'two-tailed') {
            const cdf = this.chiSquareCDF(chiSquareStatistic, df);
            pValue = 2 * Math.min(cdf, 1 - cdf);
        } else if (testType === 'right-tailed') {
            pValue = 1 - this.chiSquareCDF(chiSquareStatistic, df);
        } else { // left-tailed
            pValue = this.chiSquareCDF(chiSquareStatistic, df);
        }

        // 记录结果
        this.simulationResults.totalTests++;
        this.simulationResults.pValues.push(pValue);
        this.simulationResults.chiSquareStats.push(chiSquareStatistic);
        
        if (pValue < alpha) {
            this.simulationResults.rejections++;
        }
    }

    // 更新模拟结果显示
    updateSimulationResults() {
        const rejectionRate = (this.simulationResults.rejections / this.simulationResults.totalTests * 100).toFixed(2);
        const alpha = parseFloat(document.getElementById('alpha').value);
        const expectedRate = (alpha * 100).toFixed(2);

        const avgPValue = (this.simulationResults.pValues.reduce((sum, p) => sum + p, 0) / this.simulationResults.pValues.length).toFixed(4);
        const avgChiSquare = (this.simulationResults.chiSquareStats.reduce((sum, chi) => sum + chi, 0) / this.simulationResults.chiSquareStats.length).toFixed(4);

        // 计算检验功效
        const trueSigmaSquared = parseFloat(document.getElementById('trueSigmaSquared').value);
        const sigma0Squared = parseFloat(document.getElementById('sigma0Squared').value);
        const isH0True = Math.abs(trueSigmaSquared - sigma0Squared) < 0.001; // 判断H0是否为真
        
        let powerInfo = '';
        if (isH0True) {
            // H0为真时，拒绝率应该等于α（第一类错误率）
            powerInfo = `
                <strong>第一类错误率:</strong> ${rejectionRate}% (理论值: ${expectedRate}%)<br>
                <strong>检验功效:</strong> 不适用 (H₀为真)
            `;
        } else {
            // H0为假时，拒绝率就是检验功效
            const power = rejectionRate;
            powerInfo = `
                <strong>检验功效（非理论值）:</strong> ${power}%<br>
                <strong>第二类错误率:</strong> ${(100 - parseFloat(power)).toFixed(2)}%
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
                        <strong>平均χ²统计量:</strong> ${avgChiSquare}<br>
                        <strong>真实方差:</strong> ${trueSigmaSquared}<br>
                        <strong>假设方差:</strong> ${sigma0Squared}
                    </div>
                </div>
                <div class="mt-2">
                    <small class="text-muted">
                        ${isH0True ? 
                          (Math.abs(parseFloat(rejectionRate) - parseFloat(expectedRate)) < 2 ? 
                            '✓ 第一类错误率接近理论值，模拟结果正常' : 
                            '⚠ 第一类错误率偏离理论值较大') :
                          `✓ 检验功效: ${rejectionRate}% (真实方差${trueSigmaSquared > sigma0Squared ? '大于' : '小于'}假设方差)`}
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
            chiSquareStats: []
        };

        document.getElementById('simulationStatus').textContent = '就绪';
        
        // 移除模拟结果显示
        const simulationResults = document.querySelector('.alert-info');
        if (simulationResults && simulationResults.innerHTML.includes('模拟结果')) {
            simulationResults.remove();
        }
    }
}