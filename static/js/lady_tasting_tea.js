class LadyTastingTeaSimulator {
    constructor() {
        this.cupCount = 8;
        this.teaCups = [];
        this.userSelections = {};
        this.experimentMode = 'human';
        this.virtualAbility = 80;
        this.currentStep = 'setup';
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // 实验模式切换
        document.querySelectorAll('input[name="experimentMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.experimentMode = e.target.value;
                this.toggleVirtualLadyPanel();
            });
        });
        
        // 虚拟女士能力滑块
        document.getElementById('abilityLevel').addEventListener('input', (e) => {
            this.virtualAbility = parseInt(e.target.value);
            document.getElementById('abilityDisplay').textContent = `${this.virtualAbility}%`;
        });
        
        // 茶杯数量选择
        document.getElementById('cupCount').addEventListener('change', (e) => {
            this.cupCount = parseInt(e.target.value);
        });
        
        // 准备实验按钮
        document.getElementById('setupExperiment').addEventListener('click', () => {
            this.setupExperiment();
        });
        
        // 提交结果按钮
        document.getElementById('submitResults').addEventListener('click', () => {
            this.submitResults();
        });
        
        // 重新开始按钮
        document.getElementById('resetExperiment').addEventListener('click', () => {
            this.resetExperiment();
        });
        
        // 新实验按钮
        document.getElementById('newExperiment').addEventListener('click', () => {
            this.newExperiment();
        });
        
        // 运行模拟按钮
        document.getElementById('runSimulation').addEventListener('click', () => {
            this.runSimulation();
        });
    }
    
    toggleVirtualLadyPanel() {
        const abilityStep = document.getElementById('virtualAbilityStep');
        const simulationStep = document.getElementById('simulationCountStep');
        
        if (this.experimentMode === 'virtual') {
            abilityStep.style.display = 'block';
            simulationStep.style.display = 'block';
        } else {
            abilityStep.style.display = 'none';
            simulationStep.style.display = 'none';
        }
    }
    
    setupExperiment() {
        this.generateTeaCups();
        
        if (this.experimentMode === 'virtual') {
            this.startVirtualTasting();
        } else {
            this.createTeaCupElements();
            this.showTastingArea();
            this.showVirtualLadyAvatar(); // 确保在人工模式时隐藏虚拟女士
        }
        
        this.currentStep = 'tasting';
    }
    
    generateTeaCups() {
        this.teaCups = [];
        const halfCount = this.cupCount / 2;
        
        // 生成一半先加茶，一半先加奶
        for (let i = 0; i < halfCount; i++) {
            this.teaCups.push({ id: i + 1, type: 'tea-first', actualType: 'tea-first' });
        }
        for (let i = 0; i < halfCount; i++) {
            this.teaCups.push({ id: i + halfCount + 1, type: 'milk-first', actualType: 'milk-first' });
        }
        
        // 随机打乱顺序
        this.shuffleArray(this.teaCups);
        
        // 重新分配显示ID
        this.teaCups.forEach((cup, index) => {
            cup.displayId = index + 1;
        });
        
        this.userSelections = {};
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    createTeaCupElements() {
        const container = document.getElementById('teaCupContainer');
        container.innerHTML = '';
        
        // 设置网格列数
        const columns = this.cupCount <= 8 ? 4 : Math.ceil(Math.sqrt(this.cupCount));
        container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        
        this.teaCups.forEach(cup => {
            const cupElement = document.createElement('div');
            cupElement.className = 'tea-cup tasting-animation';
            cupElement.dataset.cupId = cup.id;
            cupElement.innerHTML = `
                <i class="fas fa-coffee" style="font-size: 2em; color: #8b4513;"></i>
                <div class="tea-cup-number">${cup.displayId}</div>
            `;
            
            // 只在人工模式下添加点击事件
            if (this.experimentMode === 'human') {
                cupElement.addEventListener('click', this.handleCupClick.bind(this));
                cupElement.style.cursor = 'pointer';
            } else {
                cupElement.style.cursor = 'default';
            }
            
            container.appendChild(cupElement);
        });
    }
    
    handleCupClick(e) {
        const cupId = parseInt(e.currentTarget.dataset.cupId);
        const cup = this.teaCups.find(c => c.id === cupId);
        
        if (!cup) return;
        
        // 切换选择状态
        if (this.userSelections[cupId] === 'tea-first') {
            this.userSelections[cupId] = 'milk-first';
        } else if (this.userSelections[cupId] === 'milk-first') {
            delete this.userSelections[cupId];
        } else {
            this.userSelections[cupId] = 'tea-first';
        }
        
        this.updateCupAppearance(e.currentTarget, cupId);
        this.updateProgress();
    }
    
    updateCupAppearance(cupElement, cupId) {
        cupElement.className = 'tea-cup';
        
        if (this.userSelections[cupId] === 'tea-first') {
            cupElement.classList.add('selected-tea-first');
        } else if (this.userSelections[cupId] === 'milk-first') {
            cupElement.classList.add('selected-milk-first');
        }
    }
    
    updateProgress() {
        const selectedCount = Object.keys(this.userSelections).length;
        const progress = (selectedCount / this.cupCount) * 100;
        
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `进度：${selectedCount}/${this.cupCount}`;
        
        // 启用/禁用提交按钮
        const submitButton = document.getElementById('submitResults');
        if (selectedCount === this.cupCount) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-check me-2"></i>提交结果';
        } else {
            submitButton.disabled = true;
            submitButton.innerHTML = `<i class="fas fa-clock me-2"></i>请完成所有分类 (${selectedCount}/${this.cupCount})`;
        }
    }
    
    startVirtualTasting() {
        this.createTeaCupElements();
        this.showTastingArea();
        
        // 显示虚拟女士形象
        this.showVirtualLadyAvatar();
        
        // 显示虚拟女士正在品茶的提示
        this.showVirtualTastingStatus();
        
        // 开始自动品茶过程
        setTimeout(() => {
            this.performVirtualTasting();
        }, 1000);
    }
    
    showVirtualLadyAvatar() {
        const avatar = document.getElementById('virtualLadyAvatar');
        const instruction = document.getElementById('tastingInstruction');
        
        if (this.experimentMode === 'virtual') {
            avatar.style.display = 'block';
            instruction.textContent = '虚拟女士正在仔细品尝每杯茶...';
        } else {
            avatar.style.display = 'none';
            instruction.textContent = '请仔细品尝每杯茶，然后点击茶杯进行分类';
        }
    }
    
    showVirtualTastingStatus() {
        const progressText = document.getElementById('progressText');
        const submitButton = document.getElementById('submitResults');
        
        progressText.innerHTML = `
            <i class="fas fa-robot me-2 text-info"></i>
            虚拟女士正在品茶中...
        `;
        
        submitButton.innerHTML = `
            <i class="fas fa-spinner fa-spin me-2"></i>
            品茶进行中...
        `;
        submitButton.disabled = true;
    }
    
    async performVirtualTasting() {
        const simulationCount = parseInt(document.getElementById('simulationCount').value);
        
        if (simulationCount === 1) {
            await this.performSingleVirtualTasting();
        } else {
            await this.performBatchVirtualTasting(simulationCount);
        }
    }
    
    async performSingleVirtualTasting() {
        // 先让虚拟女士品尝所有茶杯（显示动画）
        for (let i = 0; i < this.teaCups.length; i++) {
            const cup = this.teaCups[i];
            await this.tasteSingleCup(cup, i + 1);
        }
        
        // 品尝完成后，进行整体分类决策
        await this.makeVirtualClassification();
        
        // 完成后自动显示结果
        this.completeVirtualTasting();
    }
    
    async tasteSingleCup(cup, cupNumber) {
        const cupElement = document.querySelector(`[data-cup-id="${cup.id}"]`);
        const progressText = document.getElementById('progressText');
        const ladyAvatar = document.querySelector('.lady-avatar');
        
        // 高亮当前正在品尝的茶杯
        cupElement.style.transform = 'scale(1.1)';
        cupElement.style.boxShadow = '0 0 20px rgba(255, 193, 7, 0.8)';
        
        // 添加女士品茶动画
        if (ladyAvatar) {
            ladyAvatar.classList.add('tasting');
        }
        
        // 显示品茶状态
        progressText.innerHTML = `
            <i class="fas fa-coffee me-2 text-warning"></i>
            正在品尝第 ${cupNumber} 杯茶... 
            <small class="text-muted">(能力水平: ${this.virtualAbility}%)</small>
        `;
        
        // 模拟思考时间（能力越低思考越久）
        const thinkingTime = 800 + (100 - this.virtualAbility) * 20;
        await this.delay(thinkingTime);
        
        // 恢复茶杯样式
        cupElement.style.transform = 'scale(1)';
        cupElement.style.boxShadow = '';
        
        // 移除品茶动画
        if (ladyAvatar) {
            ladyAvatar.classList.remove('tasting');
        }
        
        // 短暂停顿
        await this.delay(300);
    }
    
    async makeVirtualClassification() {
        const progressText = document.getElementById('progressText');
        
        // 显示分类思考过程
        progressText.innerHTML = `
            <i class="fas fa-brain me-2 text-info"></i>
            正在进行整体分类决策...
            <small class="text-muted">(必须选出4杯先加茶、4杯先加奶)</small>
        `;
        
        await this.delay(1500);
        
        // 获取所有先加茶的茶杯
        const teaFirstCups = this.teaCups.filter(cup => cup.actualType === 'tea-first');
        const halfCount = this.cupCount / 2;
        
        // 根据能力水平决定正确识别的先加茶茶杯数量
        // 使用超几何分布的概率模型
        const correctTeaFirstCount = this.sampleCorrectCount(halfCount, this.virtualAbility);
        
        // 随机选择要正确识别的先加茶茶杯
        const shuffledTeaFirst = [...teaFirstCups];
        this.shuffleArray(shuffledTeaFirst);
        
        // 清空之前的选择
        this.userSelections = {};
        
        // 设置正确识别的先加茶茶杯
        for (let i = 0; i < correctTeaFirstCount; i++) {
            this.userSelections[shuffledTeaFirst[i].id] = 'tea-first';
        }
        
        // 设置错误识别的先加茶茶杯（被分类为先加奶）
        for (let i = correctTeaFirstCount; i < halfCount; i++) {
            this.userSelections[shuffledTeaFirst[i].id] = 'milk-first';
        }
        
        // 获取所有先加奶的茶杯
        const milkFirstCups = this.teaCups.filter(cup => cup.actualType === 'milk-first');
        const shuffledMilkFirst = [...milkFirstCups];
        this.shuffleArray(shuffledMilkFirst);
        
        // 由于必须选出4杯作为"先加茶"，剩余的先加茶位置由先加奶茶杯填补
        const remainingTeaFirstSlots = halfCount - correctTeaFirstCount;
        
        // 设置被错误分类为先加茶的先加奶茶杯
        for (let i = 0; i < remainingTeaFirstSlots; i++) {
            this.userSelections[shuffledMilkFirst[i].id] = 'tea-first';
        }
        
        // 设置正确识别的先加奶茶杯
        for (let i = remainingTeaFirstSlots; i < halfCount; i++) {
            this.userSelections[shuffledMilkFirst[i].id] = 'milk-first';
        }
        
        // 更新所有茶杯的外观
        this.teaCups.forEach(cup => {
            const cupElement = document.querySelector(`[data-cup-id="${cup.id}"]`);
            if (cupElement) {
                this.updateCupAppearance(cupElement, cup.id);
            }
        });
        
        // 显示分类完成
        progressText.innerHTML = `
            <i class="fas fa-check me-2 text-success"></i>
            分类决策完成！选出了4杯先加茶、4杯先加奶
        `;
        
        await this.delay(1000);
    }
    
    // 根据能力水平采样正确识别的先加茶茶杯数量
    sampleCorrectCount(halfCount, ability) {
        // 能力水平转换为在超几何分布中的表现
        // 100%能力 = 全部正确(4个)
        // 0%能力 = 随机猜测的期望值(2个)
        // 50%能力 = 介于随机和完美之间
        
        if (ability >= 100) return halfCount;
        if (ability <= 0) return Math.floor(Math.random() * (halfCount + 1));
        
        // 使用Beta分布来模拟能力水平对应的正确率分布
        // 能力越高，越倾向于识别更多正确的茶杯
        const normalizedAbility = ability / 100;
        
        // 简化模型：根据能力水平的概率分布来决定正确数量
        const probabilities = [];
        for (let k = 0; k <= halfCount; k++) {
            // 使用二项分布的概率，但调整参数以反映约束条件
            const p = normalizedAbility;
            const prob = this.binomialPMF(halfCount, k, p);
            probabilities.push(prob);
        }
        
        // 根据概率分布采样
        return this.sampleFromDistribution(probabilities);
    }
    
    binomialPMF(n, k, p) {
        return this.combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }
    
    sampleFromDistribution(probabilities) {
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < probabilities.length; i++) {
            cumulative += probabilities[i];
            if (random <= cumulative) {
                return i;
            }
        }
        
        return probabilities.length - 1;
    }
    
    async performBatchVirtualTasting(count) {
        const progressText = document.getElementById('progressText');
        
        progressText.innerHTML = `
            <i class="fas fa-calculator me-2 text-info"></i>
            正在进行 ${count.toLocaleString()} 次虚拟实验...
        `;
        
        // 批量模拟不显示动画，直接计算结果
        await this.delay(1500);
        
        this.runMultipleVirtualExperiments(count);
        this.completeVirtualTasting();
    }
    
    completeVirtualTasting() {
        const progressText = document.getElementById('progressText');
        const submitButton = document.getElementById('submitResults');
        
        // 如果是单次实验，分析结果
        if (!this.lastResult || !this.lastResult.isMultipleSimulation) {
            this.analyzeVirtualResults();
        }
        
        // 更新界面状态
        progressText.innerHTML = `
            <i class="fas fa-check-circle me-2 text-success"></i>
            虚拟品茶完成！
        `;
        
        submitButton.innerHTML = `
            <i class="fas fa-eye me-2"></i>
            查看结果
        `;
        submitButton.disabled = false;
        
        // 自动滚动到提交按钮
        submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 高亮提交按钮
        submitButton.classList.add('btn-pulse');
        setTimeout(() => {
            submitButton.classList.remove('btn-pulse');
        }, 2000);
    }
    
    analyzeVirtualResults() {
        let correctCount = 0;
        let teaFirstCorrect = 0;
        let milkFirstCorrect = 0;
        let teaFirstTotal = 0;
        let milkFirstTotal = 0;
        
        this.teaCups.forEach(cup => {
            const userSelection = this.userSelections[cup.id];
            const actualType = cup.actualType;
            
            if (actualType === 'tea-first') {
                teaFirstTotal++;
                if (userSelection === 'tea-first') {
                    teaFirstCorrect++;
                    correctCount++;
                }
            } else {
                milkFirstTotal++;
                if (userSelection === 'milk-first') {
                    milkFirstCorrect++;
                    correctCount++;
                }
            }
        });
        
        this.lastResult = {
            correctCount,
            totalCount: this.cupCount,
            teaFirstCorrect,
            teaFirstTotal,
            milkFirstCorrect,
            milkFirstTotal,
            accuracy: (correctCount / this.cupCount) * 100,
            isVirtual: true,
            virtualAbility: this.virtualAbility
        };
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showTastingArea() {
        document.getElementById('tastingArea').style.display = 'block';
        document.getElementById('tastingArea').scrollIntoView({ behavior: 'smooth' });
    }
    
    submitResults() {
        if (this.experimentMode === 'human') {
            this.analyzeHumanResults();
        }
        // 虚拟模式的结果已经在 completeVirtualTasting() 中分析过了
        
        this.showResults();
        this.currentStep = 'results';
    }
    
    analyzeHumanResults() {
        let correctCount = 0;
        let teaFirstCorrect = 0;
        let milkFirstCorrect = 0;
        let teaFirstTotal = 0;
        let milkFirstTotal = 0;
        
        this.teaCups.forEach(cup => {
            const userSelection = this.userSelections[cup.id];
            const actualType = cup.actualType;
            
            if (actualType === 'tea-first') {
                teaFirstTotal++;
                if (userSelection === 'tea-first') {
                    teaFirstCorrect++;
                    correctCount++;
                }
            } else {
                milkFirstTotal++;
                if (userSelection === 'milk-first') {
                    milkFirstCorrect++;
                    correctCount++;
                }
            }
        });
        
        this.lastResult = {
            correctCount,
            totalCount: this.cupCount,
            teaFirstCorrect,
            teaFirstTotal,
            milkFirstCorrect,
            milkFirstTotal,
            accuracy: (correctCount / this.cupCount) * 100
        };
    }
    
    runVirtualExperiment() {
        const simulationCount = parseInt(document.getElementById('simulationCount').value);
        
        if (simulationCount === 1) {
            this.runSingleVirtualExperiment();
        } else {
            this.runMultipleVirtualExperiments(simulationCount);
        }
    }
    
    runSingleVirtualExperiment() {
        const halfCount = this.cupCount / 2;
        
        // 根据能力水平决定正确识别的先加茶茶杯数量
        const correctTeaFirstCount = this.sampleCorrectCount(halfCount, this.virtualAbility);
        
        // 获取所有先加茶和先加奶的茶杯
        const teaFirstCups = this.teaCups.filter(cup => cup.actualType === 'tea-first');
        const milkFirstCups = this.teaCups.filter(cup => cup.actualType === 'milk-first');
        
        // 随机选择要正确识别的茶杯
        const shuffledTeaFirst = [...teaFirstCups];
        const shuffledMilkFirst = [...milkFirstCups];
        this.shuffleArray(shuffledTeaFirst);
        this.shuffleArray(shuffledMilkFirst);
        
        // 清空之前的选择
        this.userSelections = {};
        
        // 设置正确识别的先加茶茶杯
        for (let i = 0; i < correctTeaFirstCount; i++) {
            this.userSelections[shuffledTeaFirst[i].id] = 'tea-first';
        }
        
        // 设置错误识别的先加茶茶杯（被分类为先加奶）
        for (let i = correctTeaFirstCount; i < halfCount; i++) {
            this.userSelections[shuffledTeaFirst[i].id] = 'milk-first';
        }
        
        // 由于必须选出4杯作为"先加茶"，剩余位置由先加奶茶杯填补
        const remainingTeaFirstSlots = halfCount - correctTeaFirstCount;
        
        // 设置被错误分类为先加茶的先加奶茶杯
        for (let i = 0; i < remainingTeaFirstSlots; i++) {
            this.userSelections[shuffledMilkFirst[i].id] = 'tea-first';
        }
        
        // 设置正确识别的先加奶茶杯
        for (let i = remainingTeaFirstSlots; i < halfCount; i++) {
            this.userSelections[shuffledMilkFirst[i].id] = 'milk-first';
        }
        
        // 计算结果
        const totalCorrect = correctTeaFirstCount * 2; // 正确的先加茶 + 正确的先加奶
        const teaFirstCorrect = correctTeaFirstCount;
        const milkFirstCorrect = correctTeaFirstCount; // 由于约束，这两个数量相等
        
        this.lastResult = {
            correctCount: totalCorrect,
            totalCount: this.cupCount,
            teaFirstCorrect,
            teaFirstTotal: halfCount,
            milkFirstCorrect,
            milkFirstTotal: halfCount,
            accuracy: (totalCorrect / this.cupCount) * 100,
            isVirtual: true,
            virtualAbility: this.virtualAbility
        };
        
        // 更新茶杯显示
        this.teaCups.forEach(cup => {
            const cupElement = document.querySelector(`[data-cup-id="${cup.id}"]`);
            if (cupElement) {
                this.updateCupAppearance(cupElement, cup.id);
            }
        });
    }
    
    runMultipleVirtualExperiments(count) {
        const results = [];
        const halfCount = this.cupCount / 2;
        
        for (let i = 0; i < count; i++) {
            // 根据能力水平决定正确识别的先加茶茶杯数量
            const correctTeaFirstCount = this.sampleCorrectCount(halfCount, this.virtualAbility);
            
            // 总正确数 = 正确识别的先加茶数量 + 正确识别的先加奶数量
            // 由于约束条件，正确识别的先加奶数量 = correctTeaFirstCount
            const totalCorrect = correctTeaFirstCount * 2;
            
            results.push(totalCorrect);
        }
        
        this.lastResult = {
            isMultipleSimulation: true,
            simulationCount: count,
            results: results,
            totalCount: this.cupCount,
            virtualAbility: this.virtualAbility,
            averageCorrect: results.reduce((a, b) => a + b, 0) / count,
            averageAccuracy: (results.reduce((a, b) => a + b, 0) / count / this.cupCount) * 100
        };
    }
    
    showResults() {
        document.getElementById('resultsArea').style.display = 'block';
        this.displayExperimentResults();
        this.displayStatisticalAnalysis();
        document.getElementById('resultsArea').scrollIntoView({ behavior: 'smooth' });
    }
    
    displayExperimentResults() {
        const container = document.getElementById('experimentResults');
        
        if (this.lastResult.isMultipleSimulation) {
            this.displayMultipleSimulationResults(container);
        } else {
            this.displaySingleExperimentResults(container);
        }
    }
    
    displaySingleExperimentResults(container) {
        const result = this.lastResult;
        const halfCount = this.cupCount / 2;
        
        container.innerHTML = `
            <div class="mb-4">
                <h6>实验结果总览</h6>
                <div class="row text-center">
                    <div class="col-4">
                        <div class="border rounded p-3">
                            <div class="display-4 text-success mb-2">${result.correctCount}</div>
                            <div class="fw-bold">正确分类</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="border rounded p-3">
                            <div class="display-4 text-danger mb-2">${result.totalCount - result.correctCount}</div>
                            <div class="fw-bold">错误分类</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="border rounded p-3">
                            <div class="display-4 text-primary mb-2">${result.accuracy.toFixed(1)}%</div>
                            <div class="fw-bold">准确率</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mb-4">
                <h6>详细分析</h6>
                <div class="row">
                    <div class="col-6">
                        <div class="border rounded p-4 text-center">
                            <div style="font-size: 4rem; color: #8b4513;" class="mb-3">☕</div>
                            <div class="h5 mb-2"><strong>先加茶叶</strong></div>
                            <div class="h6 mb-2">${result.teaFirstCorrect}/${result.teaFirstTotal} 正确</div>
                            <div class="text-muted">${((result.teaFirstCorrect/result.teaFirstTotal)*100).toFixed(1)}% 准确率</div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="border rounded p-4 text-center">
                            <div style="font-size: 4rem; color: #daa520;" class="mb-3">🥛</div>
                            <div class="h5 mb-2"><strong>先加牛奶</strong></div>
                            <div class="h6 mb-2">${result.milkFirstCorrect}/${result.milkFirstTotal} 正确</div>
                            <div class="text-muted">${((result.milkFirstCorrect/result.milkFirstTotal)*100).toFixed(1)}% 准确率</div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${result.isVirtual ? `
                <div class="alert alert-info">
                    <i class="fas fa-robot me-2"></i>
                    <strong>虚拟女士模拟</strong><br>
                    设定能力水平：${result.virtualAbility}%<br>
                    实际表现：${result.accuracy.toFixed(1)}%
                </div>
            ` : ''}
        
        `;
    }
    
    displayMultipleSimulationResults(container) {
        const result = this.lastResult;
        const distribution = this.calculateDistribution(result.results);
        
        container.innerHTML = `
            <div class="mb-3">
                <h6>多次模拟结果 (${result.simulationCount.toLocaleString()}次)</h6>
                <div class="row text-center">
                    <div class="col-4">
                        <div class="border rounded p-2">
                            <div class="h4 text-primary">${result.averageCorrect.toFixed(2)}</div>
                            <small>平均正确数</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="border rounded p-2">
                            <div class="h4 text-success">${result.averageAccuracy.toFixed(1)}%</div>
                            <small>平均准确率</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="border rounded p-2">
                            <div class="h4 text-info">${result.virtualAbility}%</div>
                            <small>设定能力</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mb-3">
                <h6>结果分布</h6>
                <div class="small">
                    ${Object.entries(distribution).map(([correct, count]) => 
                        `<div class="d-flex justify-content-between">
                            <span>${correct}个正确:</span>
                            <span>${count}次 (${((count/result.simulationCount)*100).toFixed(1)}%)</span>
                        </div>`
                    ).join('')}
                </div>
            </div>
            
            <div class="alert alert-info">
                <i class="fas fa-chart-bar me-2"></i>
                <strong>统计观察</strong><br>
                全部正确的概率: ${((distribution[result.totalCount] || 0)/result.simulationCount*100).toFixed(2)}%<br>
                至少${Math.ceil(result.totalCount*0.75)}个正确的概率: ${this.calculateCumulativeProbability(distribution, Math.ceil(result.totalCount*0.75), result.simulationCount).toFixed(2)}%
            </div>
        `;
    }
    
    calculateDistribution(results) {
        const distribution = {};
        results.forEach(correct => {
            distribution[correct] = (distribution[correct] || 0) + 1;
        });
        return distribution;
    }
    
    calculateCumulativeProbability(distribution, threshold, total) {
        let count = 0;
        Object.entries(distribution).forEach(([correct, freq]) => {
            if (parseInt(correct) >= threshold) {
                count += freq;
            }
        });
        return (count / total) * 100;
    }
    
    displayStatisticalAnalysis() {
        const container = document.getElementById('statisticalAnalysis');
        const halfCount = this.cupCount / 2;
        
        if (this.lastResult.isMultipleSimulation) {
            this.displayMultipleSimulationAnalysis(container);
        } else {
            this.displaySingleExperimentAnalysis(container);
        }
    }
    
    displaySingleExperimentAnalysis(container) {
        const result = this.lastResult;
        const halfCount = this.cupCount / 2;
        const pValue = this.calculatePValue(result.correctCount, halfCount);
        const isSignificant = pValue < 0.05;
        const teaFirstCorrect = result.correctCount / 2;
        
        container.innerHTML = `
            <div class="mb-3">
                <h6>Fisher精确检验</h6>
                <div class="probability-display">
                    <div><strong>实验约束:</strong> 必须选出${halfCount}杯先加茶、${halfCount}杯先加奶</div>
                    <div><strong>观察结果:</strong> 正确识别${teaFirstCorrect}杯先加茶，总计${result.correctCount}/${this.cupCount}正确</div>
                    <div><strong>p值:</strong> ${pValue.toFixed(6)}</div>
                    <div><strong>显著性水平:</strong> α = 0.05</div>
                    <div class="mt-2">
                        <strong>结论:</strong> 
                        <span class="${isSignificant ? 'text-success' : 'text-danger'}">
                            ${isSignificant ? '拒绝零假设' : '接受零假设'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="mb-3">
                <h6>概率计算</h6>
                <div class="small">
                    <p>在零假设（随机猜测）下，正确识别${teaFirstCorrect}个或更多先加茶茶杯的概率：</p>
                    <p class="text-muted">注意：由于实验约束，总正确数只能是0, 2, 4, 6, 8（偶数）</p>
                    ${this.generateProbabilityTable(halfCount, result.correctCount)}
                </div>
            </div>
            
            <div class="alert ${isSignificant ? 'alert-success' : 'alert-warning'}">
                <i class="fas ${isSignificant ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
                <strong>统计解释:</strong><br>
                ${isSignificant ? 
                    `结果具有统计显著性（p < 0.05），有足够证据表明该女士确实具有区分茶杯的能力。` :
                    `结果不具有统计显著性（p ≥ 0.05），没有足够证据表明该女士具有超出随机猜测的能力。`
                }<br>
                <small class="text-muted">
                    在经典的Fisher设计中，女士知道总数约束，因此她的分类必须严格遵循4+4的分组。
                </small>
            </div>
        `;
    }
    
    displayMultipleSimulationAnalysis(container) {
        const result = this.lastResult;
        const halfCount = this.cupCount / 2;
        const theoreticalMean = halfCount;
        const theoreticalVariance = halfCount * 0.5 * 0.5 * (this.cupCount - halfCount) / (this.cupCount - 1);
        const observedMean = result.averageCorrect;
        
        container.innerHTML = `
            <div class="mb-3">
                <h6>理论 vs 观察</h6>
                <div class="probability-display">
                    <div><strong>理论期望值:</strong> ${theoreticalMean.toFixed(2)}</div>
                    <div><strong>观察平均值:</strong> ${observedMean.toFixed(2)}</div>
                    <div><strong>理论方差:</strong> ${theoreticalVariance.toFixed(2)}</div>
                    <div><strong>设定能力:</strong> ${result.virtualAbility}%</div>
                </div>
            </div>
            
            <div class="mb-3">
                <h6>统计功效分析</h6>
                <div class="small">
                    <p>在${result.virtualAbility}%能力水平下，${result.simulationCount.toLocaleString()}次实验的表现：</p>
                    <ul>
                        <li>平均准确率: ${result.averageAccuracy.toFixed(1)}%</li>
                        <li>理论准确率: ${result.virtualAbility}%</li>
                        <li>差异: ${Math.abs(result.averageAccuracy - result.virtualAbility).toFixed(1)}%</li>
                    </ul>
                </div>
            </div>
            
            <div class="alert alert-info">
                <i class="fas fa-lightbulb me-2"></i>
                <strong>模拟洞察:</strong><br>
                大量模拟显示了统计规律的稳定性。即使个体实验可能有随机波动，
                大样本的平均结果会趋向于真实的能力水平。
            </div>
        `;
    }
    
    calculatePValue(observed, halfCount) {
        // 计算Fisher精确检验的p值
        // 在女士品茶实验中，我们计算获得observed个或更多正确先加茶分类的概率
        let pValue = 0;
        const totalCups = halfCount * 2;
        
        // 注意：observed这里是总正确数，需要转换为正确识别的先加茶数量
        const observedTeaFirstCorrect = observed / 2;
        
        for (let k = observedTeaFirstCorrect; k <= halfCount; k++) {
            pValue += this.hypergeometricPMF(k, halfCount, halfCount, totalCups);
        }
        
        return pValue;
    }
    
    hypergeometricPMF(k, K, n, N) {
        // 超几何分布概率质量函数
        // k: 成功次数, K: 总体中成功状态数, n: 抽取次数, N: 总体大小
        return this.combination(K, k) * this.combination(N - K, n - k) / this.combination(N, n);
    }
    
    combination(n, k) {
        if (k > n || k < 0) return 0;
        if (k === 0 || k === n) return 1;
        
        let result = 1;
        for (let i = 0; i < Math.min(k, n - k); i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    }
    
    generateProbabilityTable(halfCount, observed) {
        let table = '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>正确识别先加茶数</th><th>总正确数</th><th>概率</th><th>累积概率</th></tr></thead><tbody>';
        
        let cumulative = 0;
        const observedTeaFirstCorrect = observed / 2;
        
        for (let k = 0; k <= halfCount; k++) {
            const prob = this.hypergeometricPMF(k, halfCount, halfCount, halfCount * 2);
            cumulative += prob;
            
            const totalCorrect = k * 2; // 总正确数 = 正确识别的先加茶数 × 2
            const isObserved = k === observedTeaFirstCorrect;
            const rowClass = isObserved ? 'table-warning' : '';
            
            table += `<tr class="${rowClass}">
                <td>${k}</td>
                <td>${totalCorrect}</td>
                <td>${prob.toFixed(6)}</td>
                <td>${cumulative.toFixed(6)}</td>
            </tr>`;
        }
        
        table += '</tbody></table></div>';
        return table;
    }
    
    resetExperiment() {
        this.userSelections = {};
        
        // 重置茶杯外观
        document.querySelectorAll('.tea-cup').forEach(cup => {
            cup.className = 'tea-cup';
        });
        
        // 如果是虚拟模式，重新开始虚拟品茶过程
        if (this.experimentMode === 'virtual') {
            // 重新生成茶杯排列
            this.generateTeaCups();
            this.startVirtualTasting();
        } else {
            this.updateProgress();
        }
    }
    
    newExperiment() {
        // 隐藏结果区域
        document.getElementById('resultsArea').style.display = 'none';
        
        // 重新生成茶杯
        this.generateTeaCups();
        
        // 根据当前模式决定如何开始实验
        if (this.experimentMode === 'virtual') {
            this.startVirtualTasting();
        } else {
            this.createTeaCupElements();
            this.showVirtualLadyAvatar(); // 确保在人工模式时隐藏虚拟女士
        }
        
        // 滚动到品茶区域
        document.getElementById('tastingArea').scrollIntoView({ behavior: 'smooth' });
        
        this.currentStep = 'tasting';
    }
    
    runSimulation() {
        // 切换到虚拟模式并运行模拟
        this.experimentMode = 'virtual';
        document.getElementById('virtualMode').checked = true;
        this.toggleVirtualLadyPanel();
        
        // 运行虚拟实验
        this.runVirtualExperiment();
        this.displayExperimentResults();
        this.displayStatisticalAnalysis();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new LadyTastingTeaSimulator();
});