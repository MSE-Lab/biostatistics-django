class TTestOneSampleSimulator {
    constructor() {
        this.chart = null;
        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: []
        };
        
        this.initializeEventListeners();
        this.updateDisplay();
        this.createChart();
    }

    initializeEventListeners() {
        // 参数变化监听
        document.getElementById('mu0').addEventListener('input', () => this.updateDisplay());
        document.getElementById('testType').addEventListener('change', () => this.updateDisplay());
        document.getElementById('trueMu').addEventListener('input', () => this.updateDisplay());
        document.getElementById('trueSigma').addEventListener('input', () => this.updateDisplay());
        document.getElementById('alpha').addEventListener('change', () => this.updateDisplay());
        document.getElementById('sampleSize').addEventListener('input', () => this.updateDisplay());

        // 按钮事件
        document.getElementById('runTest').addEventListener('click', () => this.generateSampleAndTest());
        document.getElementById('runSimulation').addEventListener('click', () => this.runSimulation());
        document.getElementById('resetSimulation').addEventListener('click', () => this.resetSimulation());
    }

    updateDisplay() {
        const mu0 = parseFloat(document.getElementById('mu0').value);
        const testType = document.getElementById('testType').value;
        const alpha = parseFloat(document.getElementById('alpha').value);
        const n = parseInt(document.getElementById('sampleSize').value);

        // 更新假设检验步骤中的备择假设
        let alternativeText = '';
        switch(testType) {
            case 'two-tailed':
                alternativeText = 'μ ≠ μ₀ (总体均值不等于假设值)';
                break;
            case 'left-tailed':
                alternativeText = 'μ < μ₀ (总体均值小于假设值)';
                break;
            case 'right-tailed':
                alternativeText = 'μ > μ₀ (总体均值大于假设值)';
                break;
        }
        document.getElementById('alternativeHypothesis').textContent = alternativeText;

        // 更新图表
        this.updateChart();
    }

    createChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 't分布',
                    data: [],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }, {
                    label: '拒绝域',
                    data: [],
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.5)',
                    fill: 'origin',
                    tension: 0,
                    pointRadius: 0,
                    spanGaps: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        type: 'linear',
                        min: -4,
                        max: 4,
                        title: {
                            display: true,
                            text: 't值'
                        }
                    },
                    y: {
                        min: 0,
                        max: 0.45,
                        title: {
                            display: true,
                            text: '概率密度'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'testStatisticLine',
                afterDraw: (chart) => {
                    if (chart.testStatisticPosition !== undefined && chart.testResults) {
                        const ctx = chart.ctx;
                        const tValue = chart.testStatisticPosition;
                        const xPosition = chart.scales.x.getPixelForValue(tValue);
                        const yValue = chart.testResults.tDistributionPDF(tValue, chart.testResults.df);
                        const yPosition = chart.scales.y.getPixelForValue(yValue);
                        
                        // 绘制黄色垂直线
                        ctx.strokeStyle = '#ffc107';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(xPosition, chart.scales.y.top);
                        ctx.lineTo(xPosition, chart.scales.y.bottom);
                        ctx.stroke();
                        
                        // 添加文本标签
                        ctx.fillStyle = '#495057';
                        ctx.font = '12px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(`t = ${tValue.toFixed(3)}`, xPosition, yPosition - 15);
                    }
                }
            }]
        });

        this.updateChart();
    }

    updateChart() {
        if (!this.chart) return;

        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;
        const n = parseInt(document.getElementById('sampleSize').value);
        const df = n - 1;

        // 生成t分布数据
        const dataPoints = [];
        const rejectionPoints = [];

        for (let x = -4; x <= 4; x += 0.05) {
            const y = this.tDistributionPDF(x, df);
            dataPoints.push({x: x, y: y});
            
            // 生成拒绝域数据
            const inRejectionRegion = this.isInRejectionRegion(x, alpha, testType, df);
            rejectionPoints.push(inRejectionRegion ? {x: x, y: y} : {x: x, y: null});
        }

        // 更新图表数据
        this.chart.data.datasets[0].data = dataPoints;
        this.chart.data.datasets[1].data = rejectionPoints;

        // 更新图表标题
        this.chart.data.datasets[0].label = `t分布 (df=${df})`;

        this.chart.update('none');
    }

    isInRejectionRegion(x, alpha, testType, df) {
        // 获取临界值
        let leftCritical = null;
        let rightCritical = null;
        
        switch(testType) {
            case 'two-tailed':
                const criticalValue = this.getTCriticalValue(alpha / 2, df);
                leftCritical = -criticalValue;
                rightCritical = criticalValue;
                break;
            case 'left-tailed':
                leftCritical = this.getTCriticalValue(alpha, df, true);
                break;
            case 'right-tailed':
                rightCritical = this.getTCriticalValue(alpha, df);
                break;
        }

        // 判断是否在拒绝域内
        if (testType === 'two-tailed') {
            return x <= leftCritical || x >= rightCritical;
        } else if (testType === 'left-tailed') {
            return x <= leftCritical;
        } else if (testType === 'right-tailed') {
            return x >= rightCritical;
        }
        
        return false;
    }



    generateSampleAndTest() {
        const mu0 = parseFloat(document.getElementById('mu0').value);
        const trueMu = parseFloat(document.getElementById('trueMu').value);
        const trueSigma = parseFloat(document.getElementById('trueSigma').value);
        const n = parseInt(document.getElementById('sampleSize').value);
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;
        const df = n - 1;

        // 生成样本
        const sample = this.generateNormalSample(trueMu, trueSigma, n);
        const sampleMean = sample.reduce((sum, x) => sum + x, 0) / n;
        
        // 计算样本标准差
        const sampleVariance = sample.reduce((sum, x) => sum + Math.pow(x - sampleMean, 2), 0) / (n - 1);
        const sampleStd = Math.sqrt(sampleVariance);

        // 计算检验统计量
        const standardError = sampleStd / Math.sqrt(n);
        const tStatistic = (sampleMean - mu0) / standardError;

        // 计算p值
        const pValue = this.calculatePValue(tStatistic, testType, df);

        // 做出检验决策
        const reject = pValue < alpha;

        // 计算临界值
        let criticalValue;
        switch(testType) {
            case 'two-tailed':
                criticalValue = this.getTCriticalValue(alpha / 2, df);
                break;
            case 'left-tailed':
                criticalValue = this.getTCriticalValue(alpha, df, true);
                break;
            case 'right-tailed':
                criticalValue = this.getTCriticalValue(alpha, df);
                break;
        }

        // 在图表上标记检验统计量
        this.markTestStatisticOnChart(tStatistic, df);

        // 显示结果
        this.displayResults({
            sampleMean,
            sampleStd,
            tStatistic,
            df,
            pValue,
            criticalValue,
            reject,
            testType,
            alpha,
            standardError
        });
    }

    markTestStatisticOnChart(tStatistic, df) {
        if (!this.chart) return;

        // 设置图表的检验统计量位置和相关信息
        this.chart.testStatisticPosition = tStatistic;
        this.chart.testResults = {
            tDistributionPDF: (x, df) => this.tDistributionPDF(x, df),
            df: df
        };

        this.chart.update('none');
    }

    displayResults(results) {
        const {
            sampleMean, sampleStd, tStatistic, df, pValue, 
            criticalValue, reject, testType, alpha, standardError
        } = results;

        // 计算置信区间
        const criticalValueForCI = this.getTCriticalValue(0.025, df); // 95% 置信区间
        const marginOfError = criticalValueForCI * standardError;
        const ciLower = sampleMean - marginOfError;
        const ciUpper = sampleMean + marginOfError;

        let criticalText = '';
        switch(testType) {
            case 'two-tailed':
                criticalText = `±${criticalValue.toFixed(3)}`;
                break;
            case 'left-tailed':
                criticalText = criticalValue.toFixed(3);
                break;
            case 'right-tailed':
                criticalText = criticalValue.toFixed(3);
                break;
        }

        const resultsHtml = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-primary mb-3">样本统计量</h6>
                    <table class="table results-table table-sm">
                        <tbody>
                            <tr><td><strong>样本均值</strong></td><td>${sampleMean.toFixed(4)}</td></tr>
                            <tr><td><strong>样本标准差</strong></td><td>${sampleStd.toFixed(4)}</td></tr>
                            <tr><td><strong>标准误</strong></td><td>${standardError.toFixed(4)}</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6 class="text-success mb-3">检验统计量</h6>
                    <table class="table results-table table-sm">
                        <tbody>
                            <tr><td><strong>t统计量</strong></td><td>${tStatistic.toFixed(4)}</td></tr>
                            <tr><td><strong>自由度</strong></td><td>${df}</td></tr>
                            <tr><td><strong>p值</strong></td><td>${pValue.toFixed(4)}</td></tr>
                            <tr><td><strong>临界值</strong></td><td>${criticalText}</td></tr>
                            <tr><td><strong>显著性水平</strong></td><td>${alpha}</td></tr>
                            <tr><td><strong>检验结论</strong></td><td>${reject ? '<span class="text-danger">拒绝H₀</span>' : '<span class="text-success">接受H₀</span>'}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6 class="text-info mb-3">置信区间</h6>
                    <div class="alert alert-info">
                        <strong>95% 置信区间:</strong> [${ciLower.toFixed(4)}, ${ciUpper.toFixed(4)}]
                    </div>
                </div>
            </div>
        `;

        document.getElementById('resultsContainer').innerHTML = resultsHtml;
    }



    runSimulation() {
        const iterations = 1000;
        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: []
        };

        document.getElementById('simulationStatus').textContent = '运行中...';

        // 使用setTimeout来避免阻塞UI
        let completed = 0;
        const batchSize = 50;

        const runBatch = () => {
            for (let i = 0; i < batchSize && completed < iterations; i++) {
                this.runSingleTest();
                completed++;
            }

            // 更新进度
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

    runSingleTest() {
        const mu0 = parseFloat(document.getElementById('mu0').value);
        const trueMu = parseFloat(document.getElementById('trueMu').value);
        const trueSigma = parseFloat(document.getElementById('trueSigma').value);
        const n = parseInt(document.getElementById('sampleSize').value);
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;
        const df = n - 1;

        // 生成样本
        const sample = this.generateNormalSample(trueMu, trueSigma, n);
        const sampleMean = sample.reduce((sum, x) => sum + x, 0) / n;
        
        // 计算样本标准差
        const sampleVariance = sample.reduce((sum, x) => sum + Math.pow(x - sampleMean, 2), 0) / (n - 1);
        const sampleStd = Math.sqrt(sampleVariance);

        // 计算检验统计量和p值
        const standardError = sampleStd / Math.sqrt(n);
        const tStatistic = (sampleMean - mu0) / standardError;
        const pValue = this.calculatePValue(tStatistic, testType, df);

        // 记录结果
        this.simulationResults.totalTests++;
        this.simulationResults.pValues.push(pValue);
        
        if (pValue < alpha) {
            this.simulationResults.rejections++;
        }
    }

    updateSimulationResults() {
        const rejectionRate = this.simulationResults.rejections / this.simulationResults.totalTests;
        const avgPValue = this.simulationResults.pValues.reduce((sum, p) => sum + p, 0) / 
                         this.simulationResults.pValues.length;

        // 计算第二类错误率和检验功效
        const mu0 = parseFloat(document.getElementById('mu0').value);
        const trueMu = parseFloat(document.getElementById('trueMu').value);
        const alpha = parseFloat(document.getElementById('alpha').value);

        let power, typeIIError;
        if (Math.abs(trueMu - mu0) < 0.001) {
            // H0为真，拒绝率应该接近α（第一类错误率）
            power = '-';
            typeIIError = '-';
        } else {
            // H0为假，拒绝率就是检验功效，第二类错误率 = 1 - 检验功效
            power = (rejectionRate * 100).toFixed(2) + '%';
            typeIIError = ((1 - rejectionRate) * 100).toFixed(2) + '%';
        }

        // 显示模拟结果
        const simulationHtml = `
            <div class="row mt-4">
                <div class="col-12">
                    <h6 class="text-warning mb-3">模拟结果 (1000次)</h6>
                    <table class="table results-table table-sm">
                        <tbody>
                            <tr><td><strong>拒绝H₀次数</strong></td><td>${this.simulationResults.rejections}</td><td><strong>拒绝率</strong></td><td>${(rejectionRate * 100).toFixed(2)}%</td></tr>
                            <tr><td><strong>平均p值</strong></td><td>${avgPValue.toFixed(4)}</td><td><strong>检验功效</strong></td><td>${power}</td></tr>
                            <tr><td><strong>第二类错误率</strong></td><td>${typeIIError}</td><td><strong>模拟状态</strong></td><td>完成</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // 检查是否已经有模拟结果，如果有就替换，如果没有就添加
        const currentResults = document.getElementById('resultsContainer').innerHTML;
        
        // 查找是否已经存在模拟结果部分
        if (currentResults.includes('模拟结果 (1000次)')) {
            // 如果已经存在，替换整个结果容器内容，保留单次检验结果，替换模拟结果
            const resultsContainer = document.getElementById('resultsContainer');
            const existingRows = resultsContainer.querySelectorAll('.row');
            
            // 移除现有的模拟结果
            existingRows.forEach(row => {
                if (row.innerHTML.includes('模拟结果 (1000次)')) {
                    row.remove();
                }
            });
            
            // 添加新的模拟结果
            resultsContainer.insertAdjacentHTML('beforeend', simulationHtml);
        } else {
            // 如果不存在，直接添加
            document.getElementById('resultsContainer').insertAdjacentHTML('beforeend', simulationHtml);
        }
    }

    resetSimulation() {
        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: []
        };

        // 重置结果显示
        document.getElementById('resultsContainer').innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                点击"生成样本并执行检验"开始分析
            </div>
        `;

        document.getElementById('simulationStatus').textContent = '就绪';

        // 重置图表中的检验统计量标记
        if (this.chart) {
            this.chart.testStatisticPosition = undefined;
            this.chart.testResults = undefined;
            this.chart.update('none');
        }
    }

    // 辅助函数
    generateNormalSample(mean, std, size) {
        const sample = [];
        for (let i = 0; i < size; i++) {
            sample.push(this.normalRandom(mean, std));
        }
        return sample;
    }

    normalRandom(mean = 0, std = 1) {
        // Box-Muller变换
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return z * std + mean;
    }

    tDistributionPDF(x, df) {
        // t分布的概率密度函数
        const gamma1 = this.logGamma((df + 1) / 2);
        const gamma2 = this.logGamma(df / 2);
        const logPdf = gamma1 - gamma2 - 0.5 * Math.log(df * Math.PI) - 
                      ((df + 1) / 2) * Math.log(1 + (x * x) / df);
        return Math.exp(logPdf);
    }

    logGamma(x) {
        // Stirling近似的对数伽马函数
        if (x < 12) {
            return Math.log(Math.abs(this.gamma(x)));
        }
        const z = 1 / (x * x);
        const series = 1/12 - z/360 + z*z/1260 - z*z*z/1680;
        return (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI) + series / x;
    }

    gamma(x) {
        // 简化的伽马函数实现
        if (x < 0.5) {
            return Math.PI / (Math.sin(Math.PI * x) * this.gamma(1 - x));
        }
        x -= 1;
        let result = 1;
        const coefficients = [
            0.99999999999980993, 676.5203681218851, -1259.1392167224028,
            771.32342877765313, -176.61502916214059, 12.507343278686905,
            -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
        ];
        
        result = coefficients[0];
        for (let i = 1; i < coefficients.length; i++) {
            result += coefficients[i] / (x + i);
        }
        
        const t = x + coefficients.length - 1.5;
        return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * result;
    }

    tDistributionCDF(x, df) {
        // t分布的累积分布函数（使用数值积分近似）
        if (x === 0) return 0.5;
        
        const step = 0.01;
        let integral = 0;
        const start = x > 0 ? 0 : x;
        const end = x > 0 ? x : 0;
        
        for (let t = start; t <= end; t += step) {
            integral += this.tDistributionPDF(t, df) * step;
        }
        
        return x > 0 ? 0.5 + integral : 0.5 - integral;
    }

    getTCriticalValue(alpha, df, leftTail = false) {
        // t分布临界值的近似计算
        if (leftTail) {
            return -this.getTCriticalValue(alpha, df);
        }
        
        // 使用查表法的近似值
        const criticalValues = {
            1: { 0.1: 3.078, 0.05: 6.314, 0.025: 12.706, 0.01: 31.821, 0.005: 63.657 },
            2: { 0.1: 1.886, 0.05: 2.920, 0.025: 4.303, 0.01: 6.965, 0.005: 9.925 },
            3: { 0.1: 1.638, 0.05: 2.353, 0.025: 3.182, 0.01: 4.541, 0.005: 5.841 },
            4: { 0.1: 1.533, 0.05: 2.132, 0.025: 2.776, 0.01: 3.747, 0.005: 4.604 },
            5: { 0.1: 1.476, 0.05: 2.015, 0.025: 2.571, 0.01: 3.365, 0.005: 4.032 },
            10: { 0.1: 1.372, 0.05: 1.812, 0.025: 2.228, 0.01: 2.764, 0.005: 3.169 },
            15: { 0.1: 1.341, 0.05: 1.753, 0.025: 2.131, 0.01: 2.602, 0.005: 2.947 },
            20: { 0.1: 1.325, 0.05: 1.725, 0.025: 2.086, 0.01: 2.528, 0.005: 2.845 },
            30: { 0.1: 1.310, 0.05: 1.697, 0.025: 2.042, 0.01: 2.457, 0.005: 2.750 }
        };
        
        // 找到最接近的自由度
        const availableDf = Object.keys(criticalValues).map(Number).sort((a, b) => a - b);
        let closestDf = availableDf[availableDf.length - 1]; // 默认使用最大的df
        
        for (let i = 0; i < availableDf.length; i++) {
            if (df <= availableDf[i]) {
                closestDf = availableDf[i];
                break;
            }
        }
        
        // 如果df很大，使用正态分布近似
        if (df > 30) {
            return this.getStandardNormalCriticalValue(alpha);
        }
        
        const values = criticalValues[closestDf];
        return values[alpha] || this.getStandardNormalCriticalValue(alpha);
    }

    getStandardNormalCriticalValue(alpha) {
        // 标准正态分布临界值
        if (Math.abs(alpha - 0.05) < 0.001) return 1.645;
        if (Math.abs(alpha - 0.025) < 0.001) return 1.96;
        if (Math.abs(alpha - 0.01) < 0.001) return 2.326;
        if (Math.abs(alpha - 0.005) < 0.001) return 2.576;
        if (Math.abs(alpha - 0.1) < 0.001) return 1.282;
        
        return 1.96; // 默认值
    }

    calculatePValue(tStatistic, testType, df) {
        // 使用数值方法计算p值
        const absTStat = Math.abs(tStatistic);
        
        // 简化的p值计算（基于t分布表的插值）
        let oneTailP;
        
        if (df >= 30) {
            // 大样本时使用正态分布近似
            oneTailP = 1 - this.standardNormalCDF(absTStat);
        } else {
            // 小样本时使用t分布近似
            oneTailP = this.approximateTCDF(absTStat, df);
        }
        
        switch(testType) {
            case 'two-tailed':
                return 2 * oneTailP;
            case 'left-tailed':
                return tStatistic < 0 ? oneTailP : 1 - oneTailP;
            case 'right-tailed':
                return tStatistic > 0 ? oneTailP : 1 - oneTailP;
            default:
                return 0;
        }
    }

    approximateTCDF(t, df) {
        // t分布右尾概率的近似计算 P(T > t)
        if (t <= 0) return 0.5;
        
        // 使用查表法进行线性插值
        const criticalPoints = [0.674, 1.282, 1.645, 1.96, 2.326, 2.576, 3.090, 3.291];
        const probabilities = [0.25, 0.1, 0.05, 0.025, 0.01, 0.005, 0.001, 0.0005];
        
        // 调整自由度影响
        const adjustment = Math.max(0, (30 - df) / 30 * 0.2);
        
        for (let i = 0; i < criticalPoints.length; i++) {
            const adjustedCritical = criticalPoints[i] * (1 + adjustment);
            if (t <= adjustedCritical) {
                if (i === 0) return probabilities[i];
                
                // 线性插值
                const t1 = i > 0 ? criticalPoints[i-1] * (1 + adjustment) : 0;
                const t2 = adjustedCritical;
                const p1 = i > 0 ? probabilities[i-1] : 0.5;
                const p2 = probabilities[i];
                
                const ratio = (t - t1) / (t2 - t1);
                return p1 + ratio * (p2 - p1);
            }
        }
        
        return 0.0001; // 极小值
    }

    standardNormalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
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
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new TTestOneSampleSimulator();
});