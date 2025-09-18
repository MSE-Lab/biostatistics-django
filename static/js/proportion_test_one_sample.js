class ProportionTestOneSampleSimulator {
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
        document.getElementById('p0').addEventListener('input', () => this.updateDisplay());
        document.getElementById('testType').addEventListener('change', () => this.updateDisplay());
        document.getElementById('trueP').addEventListener('input', () => this.updateDisplay());
        document.getElementById('alpha').addEventListener('change', () => this.updateDisplay());
        document.getElementById('sampleSize').addEventListener('input', () => this.updateDisplay());

        // 按钮事件
        document.getElementById('runTest').addEventListener('click', () => this.generateSampleAndTest());
        document.getElementById('runSimulation').addEventListener('click', () => this.runSimulation());
        document.getElementById('resetSimulation').addEventListener('click', () => this.resetSimulation());
    }

    updateDisplay() {
        const p0 = parseFloat(document.getElementById('p0').value);
        const testType = document.getElementById('testType').value;
        const alpha = parseFloat(document.getElementById('alpha').value);

        // 更新假设检验步骤中的备择假设
        let alternativeText = '';
        switch(testType) {
            case 'two-tailed':
                alternativeText = 'p ≠ p₀ (比例不等于假设值)';
                break;
            case 'left-tailed':
                alternativeText = 'p < p₀ (比例小于假设值)';
                break;
            case 'right-tailed':
                alternativeText = 'p > p₀ (比例大于假设值)';
                break;
        }
        document.getElementById('alternativeHypothesis').textContent = alternativeText;

        // 更新图表
        this.updateChart();
    }

    createChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        // 生成初始数据
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;
        
        const dataPoints = [];
        const rejectionPoints = [];

        for (let x = -4; x <= 4; x += 0.05) {
            const y = this.standardNormalPDF(x);
            dataPoints.push({x: x, y: y});
            
            // 生成拒绝域数据
            const inRejectionRegion = this.isInRejectionRegion(x, alpha, testType);
            rejectionPoints.push(inRejectionRegion ? {x: x, y: y} : {x: x, y: null});
        }
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: '标准正态分布',
                    data: dataPoints,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                }, {
                    label: '拒绝域',
                    data: rejectionPoints,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.3)',
                    borderWidth: 0,
                    fill: true,
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: -4,
                        max: 4,
                        title: {
                            display: true,
                            text: 'z值'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '概率密度'
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
                        intersect: false
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            },
            plugins: [{
                id: 'testStatisticLine',
                afterDraw: (chart) => {
                    if (chart.testStatisticPosition !== undefined && chart.testResults) {
                        const ctx = chart.ctx;
                        const zValue = chart.testStatisticPosition;
                        const xPosition = chart.scales.x.getPixelForValue(zValue);
                        const yValue = chart.testResults.standardNormalPDF(zValue);
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
                        ctx.fillText(`z = ${zValue.toFixed(3)}`, xPosition, yPosition - 15);
                    }
                }
            }]
        });
    }

    updateChart() {
        if (!this.chart) return;

        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;

        // 生成标准正态分布数据
        const dataPoints = [];
        const rejectionPoints = [];

        for (let x = -4; x <= 4; x += 0.05) {
            const y = this.standardNormalPDF(x);
            dataPoints.push({x: x, y: y});
            
            // 生成拒绝域数据
            const inRejectionRegion = this.isInRejectionRegion(x, alpha, testType);
            rejectionPoints.push(inRejectionRegion ? {x: x, y: y} : {x: x, y: null});
        }

        // 更新图表数据
        this.chart.data.datasets[0].data = dataPoints;
        this.chart.data.datasets[1].data = rejectionPoints;

        this.chart.update('none');
    }

    isInRejectionRegion(x, alpha, testType) {
        // 获取临界值
        let leftCritical = null;
        let rightCritical = null;
        
        switch(testType) {
            case 'two-tailed':
                const criticalValue = this.getStandardNormalCriticalValue(alpha / 2);
                leftCritical = -criticalValue;
                rightCritical = criticalValue;
                break;
            case 'left-tailed':
                leftCritical = this.getStandardNormalCriticalValue(alpha, true);
                break;
            case 'right-tailed':
                rightCritical = this.getStandardNormalCriticalValue(alpha);
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
        const p0 = parseFloat(document.getElementById('p0').value);
        const trueP = parseFloat(document.getElementById('trueP').value);
        const n = parseInt(document.getElementById('sampleSize').value);
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;

        // 生成二项分布样本
        const successes = this.generateBinomialSample(trueP, n);
        const sampleProportion = successes / n;

        // 计算检验统计量（使用正态近似）
        const standardError = Math.sqrt(p0 * (1 - p0) / n);
        const zStatistic = (sampleProportion - p0) / standardError;

        // 计算p值
        const pValue = this.calculatePValue(zStatistic, testType);

        // 做出检验决策
        const reject = pValue < alpha;

        // 计算临界值
        let criticalValue;
        switch(testType) {
            case 'two-tailed':
                criticalValue = this.getStandardNormalCriticalValue(alpha / 2);
                break;
            case 'left-tailed':
                criticalValue = this.getStandardNormalCriticalValue(alpha, true);
                break;
            case 'right-tailed':
                criticalValue = this.getStandardNormalCriticalValue(alpha);
                break;
        }

        // 在图表上标记检验统计量
        this.markTestStatisticOnChart(zStatistic);

        // 显示结果
        this.displayResults({
            sampleProportion,
            successes,
            zStatistic,
            pValue,
            criticalValue,
            reject,
            testType,
            alpha,
            standardError,
            p0,
            n
        });
    }

    markTestStatisticOnChart(zStatistic) {
        if (!this.chart) return;

        // 设置图表的检验统计量位置和相关信息
        this.chart.testStatisticPosition = zStatistic;
        this.chart.testResults = {
            standardNormalPDF: (x) => this.standardNormalPDF(x)
        };

        this.chart.update('none');
    }

    displayResults(results) {
        const {
            sampleProportion, successes, zStatistic, pValue, criticalValue, 
            reject, testType, alpha, standardError, p0, n
        } = results;

        // 计算置信区间
        const criticalValueForCI = this.getStandardNormalCriticalValue(0.025); // 95% 置信区间
        const ciStandardError = Math.sqrt(sampleProportion * (1 - sampleProportion) / n);
        const marginOfError = criticalValueForCI * ciStandardError;
        const ciLower = Math.max(0, sampleProportion - marginOfError);
        const ciUpper = Math.min(1, sampleProportion + marginOfError);

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
                            <tr><td><strong>样本比例</strong></td><td>${sampleProportion.toFixed(4)}</td></tr>
                            <tr><td><strong>成功次数</strong></td><td>${successes}</td></tr>
                            <tr><td><strong>样本大小</strong></td><td>${n}</td></tr>
                            <tr><td><strong>标准误</strong></td><td>${standardError.toFixed(4)}</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6 class="text-success mb-3">检验统计量</h6>
                    <table class="table results-table table-sm">
                        <tbody>
                            <tr><td><strong>z统计量</strong></td><td>${zStatistic.toFixed(4)}</td></tr>
                            <tr><td><strong>假设比例</strong></td><td>${p0}</td></tr>
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
        const numSimulations = 1000;
        const p0 = parseFloat(document.getElementById('p0').value);
        const trueP = parseFloat(document.getElementById('trueP').value);
        const n = parseInt(document.getElementById('sampleSize').value);
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;

        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: []
        };

        for (let i = 0; i < numSimulations; i++) {
            // 生成二项分布样本
            const successes = this.generateBinomialSample(trueP, n);
            const sampleProportion = successes / n;

            // 计算检验统计量
            const standardError = Math.sqrt(p0 * (1 - p0) / n);
            const zStatistic = (sampleProportion - p0) / standardError;

            // 计算p值
            const pValue = this.calculatePValue(zStatistic, testType);

            // 记录结果
            this.simulationResults.totalTests++;
            this.simulationResults.pValues.push(pValue);

            if (pValue < alpha) {
                this.simulationResults.rejections++;
            }
        }

        this.updateSimulationResults();
    }

    updateSimulationResults() {
        const rejectionRate = this.simulationResults.rejections / this.simulationResults.totalTests;
        const avgPValue = this.simulationResults.pValues.reduce((sum, p) => sum + p, 0) / 
                         this.simulationResults.pValues.length;

        // 计算第二类错误率和检验功效
        const p0 = parseFloat(document.getElementById('p0').value);
        const trueP = parseFloat(document.getElementById('trueP').value);
        const alpha = parseFloat(document.getElementById('alpha').value);

        let power, typeIIError;
        if (Math.abs(trueP - p0) < 0.001) {
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
            rejections: 0,
            totalTests: 0,
            pValues: []
        };

        // 清空结果显示
        document.getElementById('resultsContainer').innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                点击"生成样本并执行检验"开始分析
            </div>
        `;

        // 重置图表
        if (this.chart) {
            // 清除检验统计量标记
            this.chart.testStatisticPosition = undefined;
            this.chart.testResults = undefined;
            this.chart.update('none');
        }
    }

    generateBinomialSample(p, n) {
        // 生成二项分布样本（成功次数）
        let successes = 0;
        for (let i = 0; i < n; i++) {
            if (Math.random() < p) {
                successes++;
            }
        }
        return successes;
    }

    standardNormalPDF(x) {
        return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
    }

    standardNormalCDF(x) {
        // 使用近似公式计算标准正态分布的累积分布函数
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2.0);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return 0.5 * (1.0 + sign * y);
    }

    calculatePValue(zStatistic, testType) {
        switch(testType) {
            case 'two-tailed':
                return 2 * (1 - this.standardNormalCDF(Math.abs(zStatistic)));
            case 'left-tailed':
                return this.standardNormalCDF(zStatistic);
            case 'right-tailed':
                return 1 - this.standardNormalCDF(zStatistic);
            default:
                return 0;
        }
    }

    getStandardNormalCriticalValue(alpha, leftTailed = false) {
        // 使用逆正态分布函数的近似值
        const criticalValues = {
            0.001: leftTailed ? -3.090 : 3.090,
            0.005: leftTailed ? -2.576 : 2.576,
            0.01: leftTailed ? -2.326 : 2.326,
            0.025: leftTailed ? -1.960 : 1.960,
            0.05: leftTailed ? -1.645 : 1.645,
            0.10: leftTailed ? -1.282 : 1.282
        };

        return criticalValues[alpha] || (leftTailed ? -1.960 : 1.960);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new ProportionTestOneSampleSimulator();
});