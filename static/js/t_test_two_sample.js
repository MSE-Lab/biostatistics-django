class TTestTwoSampleSimulator {
    constructor() {
        this.chart = null;
        this.testResults = null;
        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: []
        };
        
        // 确保DOM元素存在后再初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeChart();
                this.setupEventListeners();
                this.updateDisplay();
            });
        } else {
            this.initializeChart();
            this.setupEventListeners();
            this.updateDisplay();
        }
    }

    setupEventListeners() {
        // 参数变化监听
        document.getElementById('testType').addEventListener('change', () => this.updateDisplay());
        document.getElementById('significanceLevel').addEventListener('change', () => this.updateDisplay());
        document.getElementById('varianceHomogeneity').addEventListener('change', () => this.updateDisplay());
        
        // 样本参数变化监听
        document.getElementById('sampleSize1').addEventListener('input', () => this.updateDisplay());
        document.getElementById('sampleSize2').addEventListener('input', () => this.updateDisplay());
        document.getElementById('populationMean1').addEventListener('input', () => this.updateDisplay());
        document.getElementById('populationMean2').addEventListener('input', () => this.updateDisplay());
        document.getElementById('populationStd1').addEventListener('input', () => this.updateDisplay());
        document.getElementById('populationStd2').addEventListener('input', () => this.updateDisplay());

        // 按钮事件
        document.getElementById('runTest').addEventListener('click', () => this.generateSampleAndTest());
        document.getElementById('runSimulation').addEventListener('click', () => this.runSimulation());
        document.getElementById('resetSimulation').addEventListener('click', () => this.resetSimulation());
    }

    updateDisplay() {
        const testType = document.getElementById('testType').value;
        const alpha = parseFloat(document.getElementById('significanceLevel').value);
        const varianceHomogeneity = document.getElementById('varianceHomogeneity').value;

        // 更新假设显示
        let h1Text = '';
        switch(testType) {
            case 'two-tailed':
                h1Text = 'μ₁ ≠ μ₂ (两总体均值不等)';
                break;
            case 'left-tailed':
                h1Text = 'μ₁ < μ₂ (样本1均值小于样本2)';
                break;
            case 'right-tailed':
                h1Text = 'μ₁ > μ₂ (样本1均值大于样本2)';
                break;
        }
        document.getElementById('alternativeHypothesis').textContent = h1Text;

        // 更新检验统计量公式
        const formula = varianceHomogeneity === 'yes' ? 
            't = (x̄₁ - x̄₂) / (sp√(1/n₁ + 1/n₂))' : 
            't = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂)';
        document.getElementById('testStatisticFormula').textContent = formula;

        // 更新决策规则
        let decisionRule = '';
        switch(testType) {
            case 'two-tailed':
                decisionRule = `当p < ${alpha}时拒绝H₀`;
                break;
            case 'left-tailed':
                decisionRule = `当t < -t_{α,df}或p < ${alpha}时拒绝H₀`;
                break;
            case 'right-tailed':
                decisionRule = `当t > t_{α,df}或p < ${alpha}时拒绝H₀`;
                break;
        }
        document.getElementById('decisionRule').textContent = decisionRule;

        // 更新图表
        this.updateChart();
    }

    initializeChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
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
                    // 只在有检验统计量时才绘制
                    if (chart.testStatisticPosition === null || chart.testStatisticPosition === undefined) {
                        return;
                    }
                    
                    const ctx = chart.ctx;
                    const chartArea = chart.chartArea;
                    const scales = chart.scales;
                    const tValue = chart.testStatisticPosition;
                    
                    const xPosition = scales.x.getPixelForValue(tValue);
                    
                    // 绘制垂直线
                    ctx.save();
                    ctx.strokeStyle = '#ffc107';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(xPosition, chartArea.bottom);
                    ctx.lineTo(xPosition, chartArea.top);
                    ctx.stroke();
                    
                    // 添加文本标签
                    if (chart.testResults) {
                        const yValue = chart.testResults.tDistributionPDF(tValue, chart.testResults.df);
                        const yPosition = scales.y.getPixelForValue(yValue);
                        
                        ctx.fillStyle = '#333';
                        ctx.font = '12px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(`t = ${tValue.toFixed(3)}`, 
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

    updateChart() {
        if (!this.chart) return;

        const alpha = parseFloat(document.getElementById('significanceLevel').value);
        const testType = document.getElementById('testType').value;
        const df = this.calculateCurrentDf();

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
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = dataPoints;
        this.chart.data.datasets[1].data = rejectionPoints;

        // 更新图表标题
        this.chart.data.datasets[0].label = `t分布 (df=${df})`;

        this.chart.update('none');
    }

    calculateCurrentDf() {
        const n1 = parseInt(document.getElementById('sampleSize1').value);
        const n2 = parseInt(document.getElementById('sampleSize2').value);
        const varianceHomogeneity = document.getElementById('varianceHomogeneity').value;
        
        if (varianceHomogeneity === 'yes') {
            return n1 + n2 - 2;
        } else {
            // 简化的Welch自由度估计
            return Math.min(n1 - 1, n2 - 1) + 10;
        }
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
        const n1 = parseInt(document.getElementById('sampleSize1').value);
        const n2 = parseInt(document.getElementById('sampleSize2').value);
        const mu1 = parseFloat(document.getElementById('populationMean1').value);
        const mu2 = parseFloat(document.getElementById('populationMean2').value);
        const sigma1 = parseFloat(document.getElementById('populationStd1').value);
        const sigma2 = parseFloat(document.getElementById('populationStd2').value);
        const alpha = parseFloat(document.getElementById('significanceLevel').value);
        const testType = document.getElementById('testType').value;
        const varianceHomogeneity = document.getElementById('varianceHomogeneity').value;

        // 生成样本
        const sample1 = this.generateNormalSample(mu1, sigma1, n1);
        const sample2 = this.generateNormalSample(mu2, sigma2, n2);
        
        const sampleMean1 = sample1.reduce((sum, x) => sum + x, 0) / n1;
        const sampleMean2 = sample2.reduce((sum, x) => sum + x, 0) / n2;
        const meanDiff = sampleMean1 - sampleMean2;
        
        // 计算样本标准差
        const s1Squared = sample1.reduce((sum, x) => sum + Math.pow(x - sampleMean1, 2), 0) / (n1 - 1);
        const s2Squared = sample2.reduce((sum, x) => sum + Math.pow(x - sampleMean2, 2), 0) / (n2 - 1);
        const s1 = Math.sqrt(s1Squared);
        const s2 = Math.sqrt(s2Squared);

        let tStatistic, df, standardError, pooledStd, testMethod;

        if (varianceHomogeneity === 'yes') {
            // 等方差假设下的t检验
            pooledStd = Math.sqrt(((n1 - 1) * s1Squared + (n2 - 1) * s2Squared) / (n1 + n2 - 2));
            standardError = pooledStd * Math.sqrt(1/n1 + 1/n2);
            df = n1 + n2 - 2;
            testMethod = "等方差t检验";
        } else {
            // Welch's t检验
            standardError = Math.sqrt(s1Squared/n1 + s2Squared/n2);
            pooledStd = standardError; // 显示用
            
            // Welch-Satterthwaite自由度
            const numerator = Math.pow(s1Squared/n1 + s2Squared/n2, 2);
            const denominator = Math.pow(s1Squared/n1, 2)/(n1-1) + Math.pow(s2Squared/n2, 2)/(n2-1);
            df = numerator / denominator; // 保留小数，不取整
            testMethod = "Welch's t检验";
        }

        tStatistic = meanDiff / standardError;

        // 计算p值
        const pValue = this.calculatePValue(tStatistic, testType, df);

        // 做出检验决策
        const reject = pValue < alpha;

        // 计算置信区间
        const criticalValueForCI = this.getTCriticalValue(0.025, df);
        const marginOfError = criticalValueForCI * standardError;
        const ciLower = meanDiff - marginOfError;
        const ciUpper = meanDiff + marginOfError;

        // 显示结果
        this.displayResults({
            sampleMean1, sampleMean2, s1, s2, s1Squared, s2Squared,
            meanDiff, pooledStd, tStatistic, df, pValue, reject,
            ciLower, ciUpper, testMethod, alpha
        });

        // 在图表上标记检验统计量
        this.markTestStatisticOnChart(tStatistic, df);
    }

    displayResults(results) {
        const {
            sampleMean1, sampleMean2, s1, s2, s1Squared, s2Squared,
            meanDiff, pooledStd, tStatistic, df, pValue, reject,
            ciLower, ciUpper, testMethod, alpha
        } = results;

        const resultClass = reject ? 'alert-danger' : 'alert-success';
        const conclusion = reject ? '拒绝原假设' : '不拒绝原假设';
        const interpretation = reject ? 
            '有足够证据表明两总体均值存在显著差异' : 
            '没有足够证据表明两总体均值存在显著差异';

        // 创建结果HTML，参考F检验的格式
        const resultsHTML = `
            <table class="table results-table mb-3">
                <thead>
                    <tr>
                        <th colspan="3">样本统计量</th>
                        <th colspan="3">检验统计量</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>样本1均值</strong><br>${sampleMean1.toFixed(4)}</td>
                        <td><strong>样本1标准差</strong><br>${s1.toFixed(4)}</td>
                        <td><strong>样本1方差</strong><br>s₁² = ${s1Squared.toFixed(4)}</td>
                        <td><strong>t统计量</strong><br>${tStatistic.toFixed(4)}</td>
                        <td><strong>自由度</strong><br>df = ${typeof df === 'number' ? (Number.isInteger(df) ? df.toString() : df.toFixed(2)) : df}</td>
                        <td><strong>均值差</strong><br>x̄₁ - x̄₂ = ${meanDiff.toFixed(4)}</td>
                    </tr>
                    <tr>
                        <td><strong>样本2均值</strong><br>${sampleMean2.toFixed(4)}</td>
                        <td><strong>样本2标准差</strong><br>${s2.toFixed(4)}</td>
                        <td><strong>样本2方差</strong><br>s₂² = ${s2Squared.toFixed(4)}</td>
                        <td><strong>p值</strong><br>${pValue.toFixed(6)}</td>
                        <td><strong>显著性水平</strong><br>α = ${alpha}</td>
                        <td><strong>检验方法</strong><br>${testMethod}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="alert ${resultClass}">
                <h6><i class="fas fa-gavel me-2"></i>检验结论</h6>
                <p class="mb-1"><strong>${conclusion}</strong> (p = ${pValue.toFixed(6)} ${pValue < alpha ? '<' : '≥'} α = ${alpha})</p>
                <p class="mb-1">${interpretation}</p>
                <p class="mb-0"><strong>95%置信区间:</strong> [${ciLower.toFixed(4)}, ${ciUpper.toFixed(4)}]</p>
            </div>
        `;

        document.getElementById('resultsContainer').innerHTML = resultsHTML;
    }

    markTestStatisticOnChart(tStatistic, df) {
        if (!this.chart) return;

        // 设置检验统计量位置，插件会使用这个值来绘制垂直线
        this.chart.testStatisticPosition = tStatistic;
        
        // 保存检验结果供插件使用，包括tDistributionPDF方法
        this.chart.testResults = { 
            tStatistic, 
            df,
            tDistributionPDF: (x, degrees) => this.tDistributionPDF(x, degrees)
        };
        
        // 更新图表以触发插件重绘
        this.chart.update('none');
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
        const n1 = parseInt(document.getElementById('sampleSize1').value);
        const n2 = parseInt(document.getElementById('sampleSize2').value);
        const mu1 = parseFloat(document.getElementById('populationMean1').value);
        const mu2 = parseFloat(document.getElementById('populationMean2').value);
        const sigma1 = parseFloat(document.getElementById('populationStd1').value);
        const sigma2 = parseFloat(document.getElementById('populationStd2').value);
        const alpha = parseFloat(document.getElementById('significanceLevel').value);
        const testType = document.getElementById('testType').value;
        const varianceHomogeneity = document.getElementById('varianceHomogeneity').value;

        // 生成样本
        const sample1 = this.generateNormalSample(mu1, sigma1, n1);
        const sample2 = this.generateNormalSample(mu2, sigma2, n2);
        
        const sampleMean1 = sample1.reduce((sum, x) => sum + x, 0) / n1;
        const sampleMean2 = sample2.reduce((sum, x) => sum + x, 0) / n2;
        const meanDiff = sampleMean1 - sampleMean2;
        
        // 计算样本标准差
        const s1Squared = sample1.reduce((sum, x) => sum + Math.pow(x - sampleMean1, 2), 0) / (n1 - 1);
        const s2Squared = sample2.reduce((sum, x) => sum + Math.pow(x - sampleMean2, 2), 0) / (n2 - 1);

        let tStatistic, df, standardError;

        if (varianceHomogeneity === 'yes') {
            // 等方差假设下的t检验
            const pooledVariance = ((n1 - 1) * s1Squared + (n2 - 1) * s2Squared) / (n1 + n2 - 2);
            standardError = Math.sqrt(pooledVariance * (1/n1 + 1/n2));
            df = n1 + n2 - 2;
        } else {
            // Welch's t检验
            standardError = Math.sqrt(s1Squared/n1 + s2Squared/n2);
            
            // Welch-Satterthwaite自由度
            const numerator = Math.pow(s1Squared/n1 + s2Squared/n2, 2);
            const denominator = Math.pow(s1Squared/n1, 2)/(n1-1) + Math.pow(s2Squared/n2, 2)/(n2-1);
            df = numerator / denominator; // 保留小数，不取整
        }

        tStatistic = meanDiff / standardError;
        const pValue = this.calculatePValue(tStatistic, testType, df);

        // 记录结果
        this.simulationResults.totalTests++;
        this.simulationResults.pValues.push(pValue);
        
        if (pValue < alpha) {
            this.simulationResults.rejections++;
        }
    }

    updateSimulationResults() {
        const rejectionRate = (this.simulationResults.rejections / this.simulationResults.totalTests * 100).toFixed(2);
        const alpha = parseFloat(document.getElementById('significanceLevel').value);
        const expectedRate = (alpha * 100).toFixed(2);

        const avgPValue = (this.simulationResults.pValues.reduce((sum, p) => sum + p, 0) / this.simulationResults.pValues.length).toFixed(4);

        // 计算检验功效
        const mu1 = parseFloat(document.getElementById('populationMean1').value);
        const mu2 = parseFloat(document.getElementById('populationMean2').value);
        const isH0True = Math.abs(mu1 - mu2) < 0.001;
        
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
                        <strong>总体1均值:</strong> ${mu1}<br>
                        <strong>总体2均值:</strong> ${mu2}<br>
                        <strong>均值差:</strong> ${(mu1 - mu2).toFixed(3)}
                    </div>
                </div>
                <div class="mt-2">
                    <small class="text-muted">
                        ${isH0True ? 
                          (Math.abs(parseFloat(rejectionRate) - parseFloat(expectedRate)) < 2 ? 
                            '✓ 第一类错误率接近理论值，模拟结果正常' : 
                            '⚠ 第一类错误率偏离理论值较大') :
                          `✓ 检验功效: ${rejectionRate}% (总体1均值${mu1 > mu2 ? '大于' : '小于'}总体2均值)`}
                    </small>
                </div>
            </div>
        `;

        document.getElementById('resultsContainer').innerHTML += simulationResultsHTML;
    }

    resetSimulation() {
        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: []
        };

        // 清空结果显示
        document.getElementById('resultsContainer').innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                点击"生成样本并执行检验"开始分析
            </div>
        `;
        
        document.getElementById('simulationStatus').textContent = '就绪';

        // 重置图表
        if (this.chart) {
            this.chart.testStatisticPosition = null;
            this.chart.testResults = null;
            this.testResults = null;
            this.chart.update('none');
        }

        // 移除模拟结果显示
        const simulationResults = document.querySelector('.alert-info');
        if (simulationResults && simulationResults.innerHTML.includes('模拟结果')) {
            simulationResults.remove();
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

