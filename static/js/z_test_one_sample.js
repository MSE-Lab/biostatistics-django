class ZTestOneSampleSimulator {
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
        document.getElementById('sigma').addEventListener('input', () => this.updateDisplay());
        document.getElementById('trueMu').addEventListener('input', () => this.updateDisplay());
        document.getElementById('alpha').addEventListener('change', () => this.updateDisplay());
        
        // 样本量滑块
        document.getElementById('sampleSize').addEventListener('input', (e) => {
            document.getElementById('sampleSizeValue').textContent = e.target.value;
            this.updateDisplay();
        });

        // 按钮事件
        document.getElementById('generateSample').addEventListener('click', () => this.generateSampleAndTest());
        document.getElementById('runSimulation').addEventListener('click', () => this.runSimulation());
        document.getElementById('resetSimulation').addEventListener('click', () => this.resetSimulation());
    }

    updateDisplay() {
        const mu0 = parseFloat(document.getElementById('mu0').value);
        const testType = document.getElementById('testType').value;
        const alpha = parseFloat(document.getElementById('alpha').value);

        // 更新假设显示
        document.getElementById('h0Value').textContent = mu0;
        document.getElementById('alphaValue').textContent = alpha;
        
        let h1Text = '';
        switch(testType) {
            case 'two-tailed':
                h1Text = `μ ≠ ${mu0}`;
                break;
            case 'left-tailed':
                h1Text = `μ < ${mu0}`;
                break;
            case 'right-tailed':
                h1Text = `μ > ${mu0}`;
                break;
        }
        document.getElementById('h1Value').textContent = h1Text;

        // 更新图表
        this.updateChart();
    }

    createChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '标准正态分布',
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
                            text: 'z值'
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
            }
        });

        this.updateChart();
    }

    updateChart() {
        if (!this.chart) return;

        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;

        // 生成标准正态分布数据
        const xValues = [];
        const yValues = [];

        for (let x = -4; x <= 4; x += 0.05) {
            xValues.push(x);
            yValues.push(this.standardNormalPDF(x));
        }

        // 生成拒绝域数据
        const rejectionData = this.generateRejectionRegionData(alpha, testType);

        // 更新图表数据
        this.chart.data.labels = xValues;
        this.chart.data.datasets[0].data = yValues;
        this.chart.data.datasets[1].data = rejectionData;

        // 更新临界值显示
        this.updateCriticalValueDisplay();

        this.chart.update('none');
    }

    generateRejectionRegionData(alpha, testType) {
        const rejectionData = [];
        
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

        // 为每个x值生成对应的y值（如果在拒绝域内）
        for (let x = -4; x <= 4; x += 0.05) {
            let inRejectionRegion = false;
            
            if (testType === 'two-tailed') {
                inRejectionRegion = x <= leftCritical || x >= rightCritical;
            } else if (testType === 'left-tailed') {
                inRejectionRegion = x <= leftCritical;
            } else if (testType === 'right-tailed') {
                inRejectionRegion = x >= rightCritical;
            }
            
            rejectionData.push(inRejectionRegion ? this.standardNormalPDF(x) : null);
        }

        return rejectionData;
    }

    updateCriticalValueDisplay() {
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;

        let criticalText = '';
        switch(testType) {
            case 'two-tailed':
                const criticalValue = this.getStandardNormalCriticalValue(alpha / 2);
                criticalText = `±${criticalValue.toFixed(3)}`;
                break;
            case 'left-tailed':
                const leftCritical = this.getStandardNormalCriticalValue(alpha, true);
                criticalText = leftCritical.toFixed(3);
                break;
            case 'right-tailed':
                const rightCritical = this.getStandardNormalCriticalValue(alpha);
                criticalText = rightCritical.toFixed(3);
                break;
        }
        
        document.getElementById('criticalValue').textContent = criticalText;
    }

    generateSampleAndTest() {
        const mu0 = parseFloat(document.getElementById('mu0').value);
        const sigma = parseFloat(document.getElementById('sigma').value);
        const trueMu = parseFloat(document.getElementById('trueMu').value);
        const n = parseInt(document.getElementById('sampleSize').value);
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;

        // 生成样本
        const sample = this.generateNormalSample(trueMu, sigma, n);
        const sampleMean = sample.reduce((sum, x) => sum + x, 0) / n;

        // 计算检验统计量
        const standardError = sigma / Math.sqrt(n);
        const zStatistic = (sampleMean - mu0) / standardError;

        // 计算p值
        const pValue = this.calculatePValue(zStatistic, testType);

        // 做出检验决策
        const reject = pValue < alpha;

        // 计算置信区间
        const criticalValueForCI = this.getStandardNormalCriticalValue(0.025); // 95% 置信区间
        const marginOfError = criticalValueForCI * standardError;
        const ciLower = sampleMean - marginOfError;
        const ciUpper = sampleMean + marginOfError;

        // 更新显示
        document.getElementById('sampleMean').textContent = sampleMean.toFixed(4);
        document.getElementById('testStatistic').textContent = zStatistic.toFixed(4);
        document.getElementById('pValue').textContent = pValue.toFixed(4);
        document.getElementById('testConclusion').innerHTML = reject ? 
            '<span class="text-danger">拒绝H₀</span>' : 
            '<span class="text-success">接受H₀</span>';
        document.getElementById('confidenceInterval').textContent = 
            `[${ciLower.toFixed(4)}, ${ciUpper.toFixed(4)}]`;

        // 在图表上标记检验统计量
        this.markTestStatisticOnChart(zStatistic);
    }

    markTestStatisticOnChart(zStatistic) {
        if (!this.chart) return;

        // 移除之前的标记
        this.chart.data.datasets = this.chart.data.datasets.filter(dataset => 
            dataset.label !== '检验统计量' && dataset.label !== '检验统计量线');

        // 添加检验统计量标记
        if (zStatistic >= -4 && zStatistic <= 4) {
            const yValue = this.standardNormalPDF(zStatistic);
            
            // 添加垂直线
            this.chart.data.datasets.push({
                label: '检验统计量线',
                data: [{x: zStatistic, y: 0}, {x: zStatistic, y: yValue}],
                borderColor: '#ffc107',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 0,
                showLine: true,
                tension: 0,
                fill: false
            });
            
            // 添加顶部标记点
            this.chart.data.datasets.push({
                label: '检验统计量',
                data: [{x: zStatistic, y: yValue}],
                borderColor: '#ffc107',
                backgroundColor: '#ffc107',
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false,
                type: 'scatter'
            });
        }

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
        const mu0 = parseFloat(document.getElementById('mu0').value);
        const sigma = parseFloat(document.getElementById('sigma').value);
        const trueMu = parseFloat(document.getElementById('trueMu').value);
        const n = parseInt(document.getElementById('sampleSize').value);
        const alpha = parseFloat(document.getElementById('alpha').value);
        const testType = document.getElementById('testType').value;

        // 生成样本
        const sample = this.generateNormalSample(trueMu, sigma, n);
        const sampleMean = sample.reduce((sum, x) => sum + x, 0) / n;

        // 计算检验统计量和p值
        const standardError = sigma / Math.sqrt(n);
        const zStatistic = (sampleMean - mu0) / standardError;
        const pValue = this.calculatePValue(zStatistic, testType);

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

        document.getElementById('rejectionCount').textContent = this.simulationResults.rejections;
        document.getElementById('rejectionRate').textContent = (rejectionRate * 100).toFixed(2) + '%';
        document.getElementById('avgPValue').textContent = avgPValue.toFixed(4);

        // 计算第二类错误率和检验功效
        const mu0 = parseFloat(document.getElementById('mu0').value);
        const trueMu = parseFloat(document.getElementById('trueMu').value);

        if (Math.abs(trueMu - mu0) < 0.001) {
            // H0为真，无法计算检验功效和第二类错误率
            document.getElementById('typeIIError').textContent = '-';
            document.getElementById('power').textContent = '-';
        } else {
            // H0为假，拒绝率就是检验功效，第二类错误率 = 1 - 检验功效
            const power = rejectionRate;
            const typeIIError = 1 - power;
            document.getElementById('power').textContent = (power * 100).toFixed(2) + '%';
            document.getElementById('typeIIError').textContent = (typeIIError * 100).toFixed(2) + '%';
        }
    }

    resetSimulation() {
        this.simulationResults = {
            totalTests: 0,
            rejections: 0,
            pValues: []
        };

        // 清空结果显示
        document.getElementById('sampleMean').textContent = '-';
        document.getElementById('testStatistic').textContent = '-';
        document.getElementById('pValue').textContent = '-';
        document.getElementById('testConclusion').textContent = '-';
        document.getElementById('confidenceInterval').textContent = '-';
        document.getElementById('rejectionCount').textContent = '-';
        document.getElementById('rejectionRate').textContent = '-';
        document.getElementById('typeIIError').textContent = '-';
        document.getElementById('power').textContent = '-';
        document.getElementById('avgPValue').textContent = '-';
        document.getElementById('simulationStatus').textContent = '未开始';

        // 重置图表
        if (this.chart) {
            this.chart.data.datasets = this.chart.data.datasets.filter(dataset => 
                dataset.label !== '检验统计量' && dataset.label !== '检验统计量线');
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

    standardNormalPDF(x) {
        return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
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

    getStandardNormalCriticalValue(alpha, leftTail = false) {
        // 使用近似公式计算标准正态分布的临界值
        if (leftTail) {
            return -this.getStandardNormalCriticalValue(alpha);
        }
        
        // 常用的临界值
        if (Math.abs(alpha - 0.05) < 0.001) return 1.645;
        if (Math.abs(alpha - 0.025) < 0.001) return 1.96;
        if (Math.abs(alpha - 0.01) < 0.001) return 2.326;
        if (Math.abs(alpha - 0.005) < 0.001) return 2.576;
        
        // 使用逆函数近似
        return this.inverseStandardNormal(1 - alpha);
    }

    inverseStandardNormal(p) {
        // Beasley-Springer-Moro算法的简化版本
        const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
        const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
        const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
        const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

        if (p < 0.02425) {
            const q = Math.sqrt(-2 * Math.log(p));
            return (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
        } else if (p < 0.97575) {
            const q = p - 0.5;
            const r = q * q;
            return (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q / (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
        } else {
            const q = Math.sqrt(-2 * Math.log(1 - p));
            return -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
        }
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
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new ZTestOneSampleSimulator();
});