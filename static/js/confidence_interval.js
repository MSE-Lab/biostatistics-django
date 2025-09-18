class ConfidenceIntervalCalculator {
    constructor() {
        this.chart = null;
        this.currentResult = null;
        
        this.initializeEventListeners();
        this.initializeScenarios();
    }
    
    initializeEventListeners() {
        // 计算按钮
        document.getElementById('calculateBtn').addEventListener('click', () => {
            this.calculateConfidenceInterval();
        });
        
        // 重置按钮
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetParameters();
        });
        
        // 置信水平选择
        document.getElementById('confidenceLevel').addEventListener('change', (e) => {
            this.toggleCustomConfidence(e.target.value);
        });
        
        // 参数滑块
        document.getElementById('nSlider').addEventListener('input', (e) => {
            document.getElementById('nSliderValue').textContent = e.target.value;
            document.getElementById('sampleSize').value = e.target.value;
            if (this.currentResult) {
                this.calculateConfidenceInterval();
            }
        });
        
        document.getElementById('clSlider').addEventListener('input', (e) => {
            document.getElementById('clSliderValue').textContent = e.target.value;
            document.getElementById('confidenceLevel').value = e.target.value;
            if (this.currentResult) {
                this.calculateConfidenceInterval();
            }
        });
        
        // 实时计算（当输入参数改变时）
        ['sampleMean', 'populationStd', 'sampleSize', 'customConfidence'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    if (this.currentResult) {
                        this.calculateConfidenceInterval();
                    }
                });
            }
        });
    }
    
    initializeScenarios() {
        const scenarios = {
            quality: { mean: 50.2, std: 2.5, n: 30 },
            exam: { mean: 85, std: 15, n: 100 },
            medicine: { mean: 12, std: 8, n: 40 }
        };
        
        document.querySelectorAll('.scenario-card').forEach(card => {
            card.addEventListener('click', () => {
                // 移除其他卡片的active状态
                document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
                // 添加当前卡片的active状态
                card.classList.add('active');
                
                const scenario = card.dataset.scenario;
                const data = scenarios[scenario];
                
                if (data) {
                    document.getElementById('sampleMean').value = data.mean;
                    document.getElementById('populationStd').value = data.std;
                    document.getElementById('sampleSize').value = data.n;
                    document.getElementById('nSlider').value = data.n;
                    document.getElementById('nSliderValue').textContent = data.n;
                    
                    // 自动计算
                    this.calculateConfidenceInterval();
                }
            });
        });
    }
    
    toggleCustomConfidence(value) {
        const customDiv = document.getElementById('customConfidenceDiv');
        if (value === 'custom') {
            customDiv.style.display = 'block';
        } else {
            customDiv.style.display = 'none';
        }
    }
    
    getConfidenceLevel() {
        const select = document.getElementById('confidenceLevel');
        if (select.value === 'custom') {
            const custom = parseFloat(document.getElementById('customConfidence').value);
            return isNaN(custom) ? 95 : custom;
        }
        return parseFloat(select.value);
    }
    
    // 计算标准正态分布的临界值
    getZCritical(confidenceLevel) {
        const alpha = (100 - confidenceLevel) / 100;
        const alphaHalf = alpha / 2;
        
        // 常用置信水平的临界值
        const criticalValues = {
            90: 1.645,
            95: 1.96,
            99: 2.576
        };
        
        if (criticalValues[confidenceLevel]) {
            return criticalValues[confidenceLevel];
        }
        
        // 对于自定义置信水平，使用近似计算
        return this.inverseNormalCDF(1 - alphaHalf);
    }
    
    // 标准正态分布的反函数（近似计算）
    inverseNormalCDF(p) {
        // 使用Beasley-Springer-Moro算法的简化版本
        if (p <= 0 || p >= 1) {
            throw new Error('概率值必须在0和1之间');
        }
        
        if (p < 0.5) {
            return -this.inverseNormalCDF(1 - p);
        }
        
        const c0 = 2.515517;
        const c1 = 0.802853;
        const c2 = 0.010328;
        const d1 = 1.432788;
        const d2 = 0.189269;
        const d3 = 0.001308;
        
        const t = Math.sqrt(-2 * Math.log(1 - p));
        
        return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
    }
    
    calculateConfidenceInterval() {
        try {
            // 获取输入参数
            const sampleMean = parseFloat(document.getElementById('sampleMean').value);
            const populationStd = parseFloat(document.getElementById('populationStd').value);
            const sampleSize = parseInt(document.getElementById('sampleSize').value);
            const confidenceLevel = this.getConfidenceLevel();
            
            // 验证输入
            if (isNaN(sampleMean) || isNaN(populationStd) || isNaN(sampleSize) || isNaN(confidenceLevel)) {
                throw new Error('请输入有效的数值');
            }
            
            if (populationStd <= 0) {
                throw new Error('总体标准差必须大于0');
            }
            
            if (sampleSize <= 0) {
                throw new Error('样本量必须大于0');
            }
            
            if (confidenceLevel <= 0 || confidenceLevel >= 100) {
                throw new Error('置信水平必须在0和100之间');
            }
            
            // 计算置信区间
            const zCritical = this.getZCritical(confidenceLevel);
            const standardError = populationStd / Math.sqrt(sampleSize);
            const marginError = zCritical * standardError;
            const lowerBound = sampleMean - marginError;
            const upperBound = sampleMean + marginError;
            
            // 保存结果
            this.currentResult = {
                sampleMean,
                populationStd,
                sampleSize,
                confidenceLevel,
                zCritical,
                standardError,
                marginError,
                lowerBound,
                upperBound,
                intervalWidth: upperBound - lowerBound
            };
            
            // 显示结果
            this.displayResults();
            this.updateChart();
            
            // 显示结果区域
            document.getElementById('resultsArea').style.display = 'block';
            document.getElementById('resultsArea').scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            alert('计算错误: ' + error.message);
        }
    }
    
    displayResults() {
        const result = this.currentResult;
        
        // 主要结果显示
        document.getElementById('intervalResult').innerHTML = `
            [${result.lowerBound.toFixed(3)}, ${result.upperBound.toFixed(3)}]
        `;
        
        document.getElementById('lowerBound').textContent = result.lowerBound.toFixed(3);
        document.getElementById('upperBound').textContent = result.upperBound.toFixed(3);
        document.getElementById('marginError').textContent = result.marginError.toFixed(3);
        document.getElementById('criticalValue').textContent = result.zCritical.toFixed(3);
        document.getElementById('standardError').textContent = result.standardError.toFixed(3);
        document.getElementById('intervalWidth').textContent = result.intervalWidth.toFixed(3);
        
        // 计算步骤
        document.getElementById('calculationSteps').innerHTML = `
            <div class="mb-2">
                <strong>步骤1：</strong>确定临界值<br>
                <span class="text-muted">z<sub>α/2</sub> = z<sub>${((100-result.confidenceLevel)/2/100).toFixed(3)}</sub> = ${result.zCritical.toFixed(3)}</span>
            </div>
            <div class="mb-2">
                <strong>步骤2：</strong>计算标准误差<br>
                <span class="text-muted">SE = σ/√n = ${result.populationStd}/${Math.sqrt(result.sampleSize).toFixed(3)} = ${result.standardError.toFixed(3)}</span>
            </div>
            <div class="mb-2">
                <strong>步骤3：</strong>计算误差边际<br>
                <span class="text-muted">E = z<sub>α/2</sub> × SE = ${result.zCritical.toFixed(3)} × ${result.standardError.toFixed(3)} = ${result.marginError.toFixed(3)}</span>
            </div>
            <div class="mb-2">
                <strong>步骤4：</strong>构造置信区间<br>
                <span class="text-muted">CI = x̄ ± E = ${result.sampleMean} ± ${result.marginError.toFixed(3)} = [${result.lowerBound.toFixed(3)}, ${result.upperBound.toFixed(3)}]</span>
            </div>
        `;
    }
    
    updateChart() {
        const canvas = document.getElementById('distributionChart');
        const ctx = canvas.getContext('2d');
        
        // 销毁现有图表
        if (this.chart) {
            this.chart.destroy();
        }
        
        const result = this.currentResult;
        
        // 生成标准正态分布数据
        const xValues = [];
        const yValues = [];
        const confidenceArea = [];
        const criticalArea = [];
        
        for (let x = -4; x <= 4; x += 0.1) {
            xValues.push(x);
            const y = this.normalPDF(x);
            yValues.push(y);
            
            // 置信区间内的区域
            if (Math.abs(x) <= result.zCritical) {
                confidenceArea.push(y);
            } else {
                confidenceArea.push(null);
            }
            
            // 临界区域
            if (Math.abs(x) > result.zCritical) {
                criticalArea.push(y);
            } else {
                criticalArea.push(null);
            }
        }
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xValues.map(x => x.toFixed(1)),
                datasets: [
                    {
                        label: '标准正态分布',
                        data: yValues,
                        borderColor: '#007bff',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: `置信区间 (${result.confidenceLevel}%)`,
                        data: confidenceArea,
                        backgroundColor: 'rgba(40, 167, 69, 0.3)',
                        borderColor: '#28a745',
                        borderWidth: 0,
                        fill: true,
                        pointRadius: 0
                    },
                    {
                        label: '拒绝域',
                        data: criticalArea,
                        backgroundColor: 'rgba(220, 53, 69, 0.3)',
                        borderColor: '#dc3545',
                        borderWidth: 0,
                        fill: true,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `标准正态分布 - ${result.confidenceLevel}% 置信区间`,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'z值'
                        },
                        grid: {
                            display: true
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '概率密度'
                        },
                        grid: {
                            display: true
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.1
                    }
                }
            }
        });
        
        // 添加临界值标记
        this.addCriticalValueAnnotations();
    }
    
    addCriticalValueAnnotations() {
        // 这里可以添加临界值的垂直线标记
        // 由于Chart.js的限制，我们在图表标题中显示临界值信息
        if (this.chart && this.currentResult) {
            this.chart.options.plugins.title.text = 
                `标准正态分布 - ${this.currentResult.confidenceLevel}% 置信区间 (z = ±${this.currentResult.zCritical.toFixed(3)})`;
            this.chart.update();
        }
    }
    
    // 标准正态分布的概率密度函数
    normalPDF(x, mean = 0, std = 1) {
        const coefficient = 1 / (std * Math.sqrt(2 * Math.PI));
        const exponent = -0.5 * Math.pow((x - mean) / std, 2);
        return coefficient * Math.exp(exponent);
    }
    
    resetParameters() {
        // 重置所有输入
        document.getElementById('sampleMean').value = '50';
        document.getElementById('populationStd').value = '10';
        document.getElementById('sampleSize').value = '25';
        document.getElementById('confidenceLevel').value = '95';
        document.getElementById('customConfidence').value = '';
        document.getElementById('nSlider').value = '25';
        document.getElementById('clSlider').value = '95';
        document.getElementById('nSliderValue').textContent = '25';
        document.getElementById('clSliderValue').textContent = '95';
        
        // 隐藏自定义置信水平输入
        document.getElementById('customConfidenceDiv').style.display = 'none';
        
        // 移除场景卡片的选中状态
        document.querySelectorAll('.scenario-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // 隐藏结果区域
        document.getElementById('resultsArea').style.display = 'none';
        
        // 清除当前结果
        this.currentResult = null;
        
        // 销毁图表
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new ConfidenceIntervalCalculator();
});