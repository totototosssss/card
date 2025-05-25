document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const playerHandElement = document.getElementById('player-hand');
    const playedCardZoneElement = document.getElementById('played-card-zone');
    const dialogueTextElement = document.getElementById('dialogue-text');
    const challengeButton = document.getElementById('challenge-button');
    const redrawHandButton = document.getElementById('redraw-hand-button');
    const turnNumberElement = document.getElementById('turn-number');
    const maxTurnsElement = document.getElementById('max-turns');
    const mainNumberElement = document.getElementById('main-number');
    const deckCountElement = document.getElementById('deck-count');
    const discardCountElement = document.getElementById('discard-count');
    const abilityChoiceButtonsElement = document.getElementById('ability-choice-buttons');
    const handCardCountElement = document.getElementById('hand-card-count');
    const affinityStatusElement = document.getElementById('affinity-status-area');

    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreValueElementOnResult = gameOverModal.querySelector('#final-score-value');
    const restartGameButton = document.getElementById('restart-game-button');
    const rankIconDisplayElement = gameOverModal.querySelector('#rank-icon-display');
    const rankTitleDisplayElement = gameOverModal.querySelector('#rank-title-display');
    const rankMessageDisplayElement = gameOverModal.querySelector('#rank-message-display');

    const affinityModal = document.getElementById('affinity-modal');
    const affinityTableContainer = document.getElementById('affinity-table-container');
    const closeAffinityModalButton = document.getElementById('close-affinity-modal');
    const affinityCheckButton = document.getElementById('affinity-check-button');
    
    const preGameOptionsScreen = document.getElementById('pre-game-options-screen');
    const startGameWithOptionsButton = document.getElementById('start-game-with-options-button');
    const lowerShirochanRateCheckbox = document.getElementById('lower-shirochan-rate-checkbox');
    
    const appContainer = document.querySelector('.app-container'); // ★ appContainer の定義

    // --- グローバルゲーム状態変数 ---
    let allQuizData = []; // カードゲームでは直接使用しないが、将来の別モード用に残すことも可能
    let currentQuizSet = []; // カードゲームではデッキから引いたカードリストとして扱う
    let currentQuestionIndex = 0; // カードゲームではターン数や進行度の管理に使用
    let score = 0; 
    const TARGET_NUM_QUESTIONS = 10; // カードゲームではMAX_TURNS_GAMEに相当
    // const QUIZ_DATA_FILE = "misattributed_context_quiz_data.json"; // カードゲームでは不要

    let playerHand = [];
    const MAX_HAND_SIZE = 3;
    let discardPile = [];
    let currentMainNumber = 0;
    let currentTurn = 1;
    const MAX_TURNS_GAME = 10;
    let temporaryAffinityEffect = null; 
    let redrawUsedThisGame = false;
    let temporaryAffinityLink = null; 
    let reduceShirochanRateGlobal = false;
    let lastPlayedCharacterId = null; 


    // --- カードとキャラクターデータ ---
    function isPrime(num) {
        if (num <= 1) return false; if (num <= 3) return true;
        if (num % 2 === 0 || num % 3 === 0) return false;
        for (let i = 5; i * i <= num; i = i + 6) {
            if (num % i === 0 || num % (i + 2) === 0) return false;
        }
        return true;
    }
    
    const CHAR_IDS = { NYAMA: "nyama", NANKU: "nanku", SHIROCHAN: "shirochan", YUUMARU: "yuumaru", SASAMI: "sasami" };

    const CHARACTERS = {
        [CHAR_IDS.NYAMA]: { id: CHAR_IDS.NYAMA, displayName: "にゃま", colorClass: "char-nyama", icon: "fas fa-cat", sampleImage: "nyama_art.png", 
            abilities: [
                { 
                    name: "にゃんともトリッキー！", 
                    dialogue: "ふふん、この場の空気、変えちゃうにゃん♪ どうなるかは…お楽しみにゃ！", 
                    effectType: "nyama_trickster",
                    description: "手札左2枚の相性を一時的にランダム変更！(良化/悪化)", icon: "fas fa-random" 
                },
                { 
                    name: "スコア献上、友好ズタズタ", 
                    dialogue: "スコアは欲しいけど…ちょっと嫌われちゃうかもにゃん…えへっ！", 
                    effectType: "nyama_affinity_debuff", baseValue: 10, 
                    description: "コア+10, 全員との結合強度を永続悪化(中)", 
                    icon: "fas fa-handshake-slash" 
                }
            ]},
        [CHAR_IDS.NANKU]: { id: CHAR_IDS.NANKU, displayName: "なんく", colorClass: "char-nanku", icon: "fas fa-glasses", sampleImage: "nanku_art.png",
            abilities: [
                { 
                    name: "論理的XORシフト", 
                    dialogue: "論理演算…フフ、予測不能なシフトをくれてやろう。", 
                    effect: (num) => num ^ (1 << (Math.floor(Math.random()*4)+1)), 
                    description: "コア XOR (2,4,8,16のどれか)", 
                    icon: "fas fa-shuffle" 
                },
                { 
                    name: "最適化ルーチン", 
                    dialogue: "現状を分析し、最適な調整を施す。", 
                    effect: (num) => {
                        if (num < 15) return num + 6;
                        if (num > 40) return num - 4;
                        return num + 3;
                    }, 
                    description: "コア<15なら+6, >40なら-4, 他+3", 
                    icon: "fas fa-chart-line" 
                }
            ]},
        [CHAR_IDS.SHIROCHAN]: { id: CHAR_IDS.SHIROCHAN, displayName: "しろちゃん", colorClass: "char-shirochan", icon: "fas fa-shield-heart", sampleImage: "shirochan_art.png",
            abilities: [
                { 
                    name: "漢検はゴミ！", 
                    dialogue: "漢検なんて…時間の無駄ですわ！全てを無に還しましょう！ …あら、これは…奇跡？", 
                    effectType: "shirochan_gamble", 
                    description: "コア0 (0.01%でx100)", 
                    icon: "fas fa-dumpster-fire" 
                },
                { 
                    name: "絶対純粋領域", 
                    dialogue: "私の周囲では、いかなる負の力も許しませんわ！", 
                    effectType: "shirochan_barrier", baseValue: 4,
                    description: "コア+4, 次ターン左2枚の負相性無効", 
                    icon: "fas fa-bahai" 
                }
            ]},
        [CHAR_IDS.YUUMARU]: { id: CHAR_IDS.YUUMARU, displayName: "ゆーまる", colorClass: "char-yuumaru", icon: "fas fa-ghost", sampleImage: "yuumaru_art.png",
            abilities: [
                { 
                    name: "ファントム・ルーレット", 
                    dialogue: "どっちが出るかな、どっちが出るかな～♪ 天国か地獄か…くふふっ", 
                    effectType: "yuumaru_roulette", 
                    description: "50%コア+12, 40%コア-6, 10%コア=13", 
                    icon: "fas fa-dharmachakra" 
                },
                { 
                    name: "魂の気まぐれリンク", 
                    dialogue: "ねぇねぇ、あのカードとちょっとだけシンクロしちゃうかも～？良いことになるか、悪いことになるか…♪", 
                    effectType: "yuumaru_affinity_link", 
                    description: "手札の他1枚選択、そのペアの基本相性を一時的にランダムで超強化or超弱化", 
                    icon: "fas fa-link" 
                }
            ]},
        [CHAR_IDS.SASAMI]: { id: CHAR_IDS.SASAMI, displayName: "ささみ", colorClass: "char-sasami", icon: "fas fa-gem", sampleImage: "sasami_art.png", 
            abilities: [
                { 
                    name: "絶対的魅力オーラ", 
                    dialogue: "みんな、もっと仲良くしましょ～♪ 私のために、ね！", 
                    effectType: "sasami_affinity_buff_all", stages: 2, 
                    description: "全員との結合強度を永続2段階UP", 
                    icon: "fas fa-hands-holding-heart" 
                },
                { 
                    name: "管理者権限：オーバークロック", 
                    dialogue: "ふふっ、ちょっとだけルールを書き換えちゃいますね♪ コアバリュー、限界突破！", 
                    effect: (num) => num * (Math.floor(Math.random() * 3) + 2), 
                    description: "コアバリューをランダムに2～4倍！", 
                    icon: "fas fa-terminal" 
                }
            ]}
    };
    
    const AFFINITY_STAGE_VALUE = 0.15; 
    const MAX_AFFINITY_MULTIPLIER = 1.8;
    const MIN_AFFINITY_MULTIPLIER = 0.4;
    let currentAffinityData = {}; 

    const AFFINITY_DATA_BASE = { 
        [CHAR_IDS.NYAMA]:    { [CHAR_IDS.NANKU]: 1.3, [CHAR_IDS.SHIROCHAN]: 0.6, [CHAR_IDS.YUUMARU]: 1.2, [CHAR_IDS.SASAMI]: 1.1 },
        [CHAR_IDS.NANKU]:    { [CHAR_IDS.NYAMA]: 1.3, [CHAR_IDS.SHIROCHAN]: 0.6, [CHAR_IDS.YUUMARU]: 0.7, [CHAR_IDS.SASAMI]: 1.1 },
        [CHAR_IDS.SHIROCHAN]:{ [CHAR_IDS.NYAMA]: 0.6, [CHAR_IDS.NANKU]: 0.6, [CHAR_IDS.YUUMARU]: 0.8, [CHAR_IDS.SASAMI]: 0.9 },
        [CHAR_IDS.YUUMARU]:  { [CHAR_IDS.NYAMA]: 1.2, [CHAR_IDS.SHIROCHAN]: 0.8, [CHAR_IDS.NANKU]: 0.7, [CHAR_IDS.SASAMI]: 1.2 },
        [CHAR_IDS.SASAMI]:   { /* Initialized in deepCopyAffinityData */ }
    };
    
    function deepCopyAffinityData() { 
        currentAffinityData = JSON.parse(JSON.stringify(AFFINITY_DATA_BASE));
        const allCharIds = Object.values(CHAR_IDS);
        allCharIds.forEach(id1 => {
            if (!currentAffinityData[id1]) currentAffinityData[id1] = {};
            allCharIds.forEach(id2 => {
                if (id1 === id2) return;
                if (currentAffinityData[id1][id2] === undefined && currentAffinityData[id2] && currentAffinityData[id2][id1] !== undefined) {
                    currentAffinityData[id1][id2] = currentAffinityData[id2][id1];
                } else if (currentAffinityData[id1][id2] === undefined) {
                    currentAffinityData[id1][id2] = 1.0; 
                }
            });
        });
        if (!currentAffinityData[CHAR_IDS.SASAMI] || Object.keys(currentAffinityData[CHAR_IDS.SASAMI]).length === 0) {
            currentAffinityData[CHAR_IDS.SASAMI] = {};
             Object.values(CHAR_IDS).forEach(id => {
                if (id !== CHAR_IDS.SASAMI) {
                    const baseVal = (AFFINITY_DATA_BASE[id] && AFFINITY_DATA_BASE[id][CHAR_IDS.SASAMI] !== undefined) 
                                                              ? AFFINITY_DATA_BASE[id][CHAR_IDS.SASAMI] 
                                                              : 1.0;
                    currentAffinityData[CHAR_IDS.SASAMI][id] = baseVal;
                    if(!currentAffinityData[id]){ currentAffinityData[id] = {}; } // Ensure exists
                    currentAffinityData[id][CHAR_IDS.SASAMI] = baseVal; 
                }
            });
        }
    }

    const AFFINITY_DISPLAY_INFO = { 
        PERFECT: { text: "完璧!!", icon: "fas fa-hands-clapping", class: "affinity-text-positive strong" },
        HIGH: { text: "最高", icon: "fas fa-crown", class: "affinity-text-positive strong" },
        GOOD: { text: "良好", icon: "fas fa-thumbs-up", class: "affinity-text-positive" },
        NEUTRAL:  { text: "普通", icon: "fas fa-minus-circle", class: "affinity-text-neutral" },
        BAD: { text: "注意", icon: "fas fa-thumbs-down", class: "affinity-text-negative" },
        WORST: { text: "最悪", icon: "fas fa-skull-crossbones", class: "affinity-text-negative strong" },
        DEBUFFED: { text: "弱化", icon: "fas fa-arrow-down", class: "affinity-text-negative" }
    };
    
    function getAffinityDisplayInfo(multiplier) {
        if (multiplier >= 1.5) return AFFINITY_DISPLAY_INFO.PERFECT;
        if (multiplier >= 1.2) return AFFINITY_DISPLAY_INFO.HIGH;
        if (multiplier > 1.0) return AFFINITY_DISPLAY_INFO.GOOD;
        if (multiplier <= 0.6) return AFFINITY_DISPLAY_INFO.WORST;
        if (multiplier < 1.0) return AFFINITY_DISPLAY_INFO.BAD;
        return AFFINITY_DISPLAY_INFO.NEUTRAL;
    }

    const BASE_DRAW_PROBABILITIES = {};
    let currentDrawProbabilities = {};

    function setupBaseDrawProbabilities() {
        BASE_DRAW_PROBABILITIES[CHAR_IDS.SASAMI] = 0.005; 
        const regularChars = Object.values(CHAR_IDS).filter(id => id !== CHAR_IDS.SASAMI);
        const probPerRegular = regularChars.length > 0 ? (1.0 - BASE_DRAW_PROBABILITIES[CHAR_IDS.SASAMI]) / regularChars.length : 0;
        regularChars.forEach(id => { BASE_DRAW_PROBABILITIES[id] = probPerRegular; });
        currentDrawProbabilities = { ...BASE_DRAW_PROBABILITIES }; 
    }
    
    function adjustShirochanDrawRate() {
        currentDrawProbabilities = { ...BASE_DRAW_PROBABILITIES }; 
        if (reduceShirochanRateGlobal) {
            const shirochanOriginalProb = BASE_DRAW_PROBABILITIES[CHAR_IDS.SHIROCHAN];
            const reduction = 0.05;
            let newShiroProb = Math.max(0, shirochanOriginalProb - reduction);
            let actualReduction = shirochanOriginalProb - newShiroProb;
            
            currentDrawProbabilities[CHAR_IDS.SHIROCHAN] = newShiroProb;

            const otherRegularChars = Object.values(CHAR_IDS).filter(id => id !== CHAR_IDS.SASAMI && id !== CHAR_IDS.SHIROCHAN);
            if (otherRegularChars.length > 0 && actualReduction > 0) {
                const bumpPerChar = actualReduction / otherRegularChars.length;
                otherRegularChars.forEach(id => {
                    currentDrawProbabilities[id] = (BASE_DRAW_PROBABILITIES[id] || 0) + bumpPerChar;
                });
            }
            let sum = 0; Object.values(currentDrawProbabilities).forEach(p => sum += p);
            if (sum > 0 && sum !== 1.0) { 
                 Object.keys(currentDrawProbabilities).forEach(k => currentDrawProbabilities[k] /= sum);
            }
        }
    }

    function drawCardFromDeck() {
        if (playerHand.length >= MAX_HAND_SIZE) {
            setDialogueText("手札が上限です。先にカードをプレイしてください。");
            return null;
        }
        
        const rand = Math.random();
        let cumulativeProbability = 0;
        let drawnCharId = null;

        for (const charId in currentDrawProbabilities) { 
            cumulativeProbability += currentDrawProbabilities[charId];
            if (rand < cumulativeProbability) {
                drawnCharId = charId;
                break;
            }
        }
        
        if (!drawnCharId) { 
            const characterKeys = Object.values(CHAR_IDS);
            drawnCharId = characterKeys[Math.floor(Math.random() * characterKeys.length)];
        }

        const drawnCardData = CHARACTERS[drawnCharId];
        if (!drawnCardData) { // Safety check for CHARACTERS object
            console.error("Drawn card data not found for ID:", drawnCharId);
            return null;
        }
        const newCard = { ...drawnCardData, uniqueId: `${drawnCardData.id}-${Date.now()}-${Math.random()}` }; 
        
        playerHand.push(newCard);
        if (drawnCardData.id === CHAR_IDS.SASAMI) {
            setDialogueText("キラリーン！✨ 超レアカード「ささみ」を引いた！", true);
        }
        return newCard;
    }
    
    function renderPlayerHand() {
        if (!playerHandElement) return;
        playerHandElement.innerHTML = '';
        playerHand.forEach((cardData, index) => {
            const cardElement = createCardElementDOM(cardData, index);
            playerHandElement.appendChild(cardElement);
            if (index === 1 && playerHand.length === MAX_HAND_SIZE) { 
                const separator = document.createElement('div');
                separator.className = 'hand-card-separator';
                playerHandElement.appendChild(separator);
            }
        });
        if(handCardCountElement) handCardCountElement.textContent = playerHand.length;
        updateGameCounts();
        checkAndApplyHandAffinities(false); 
    }
    
    function createCardElementDOM(cardData, handIndex = -1, isPlayedView = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${cardData.colorClass || ''}`;
        if (cardData.id === CHAR_IDS.SASAMI) cardDiv.classList.add('char-sasami-rare');
        if (isPlayedView) cardDiv.classList.add('played-card');
        if (handIndex === -1 && !isPlayedView) cardDiv.classList.add('no-hover');

        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';
    
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        
        const artArea = `
            <div class="card-art">
                <div class="art-placeholder-text">${cardData.displayName.substring(0,2).toUpperCase()}</div>
            </div>
        `;
        
        let abilitiesHTML = '<div class="card-abilities-section">';
        cardData.abilities.forEach((ability) => {
            abilitiesHTML += `
                <div class="ability-slot">
                    <div class="ability-header">
                        <i class="fas ${ability.icon || 'fa-sparkles'} ability-icon"></i>
                        <h5 class="ability-name">${ability.name}</h5>
                    </div>
                    <p class="ability-description">${ability.description}</p>
                    <p class="ability-dialogue"><em>「${ability.dialogue}」</em></p>
                </div>
            `;
        });
        abilitiesHTML += '</div>';

        cardFront.innerHTML = `
            <div class="card-header">
                <span class="card-name">${cardData.displayName}</span>
                <i class="${cardData.icon} card-char-icon"></i>
            </div>
            ${artArea}
            ${abilitiesHTML}
        `;
    
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back-face card-back-design';
        cardBack.innerHTML = `<span>NC</span>`; 
    
        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        cardDiv.appendChild(cardInner);
    
        if (handIndex !== -1 && !isPlayedView) { 
            cardDiv.dataset.handIndex = handIndex;
            cardDiv.addEventListener('click', () => handleCardSelection(handIndex));
        }
        return cardDiv;
    }
    
    function handleCardSelection(handIndex) {
        if (!playerHand[handIndex] || (abilityChoiceButtonsElement && abilityChoiceButtonsElement.style.display === 'flex')) return; 

        playerHandElement.querySelectorAll('.card').forEach(cardEl => {
            const elHandIndex = parseInt(cardEl.dataset.handIndex, 10);
            if (elHandIndex !== handIndex) {
                cardEl.style.opacity = '0.6'; 
                cardEl.style.transform = 'scale(0.95)';
            } else {
                cardEl.style.transform = 'translateY(-10px) scale(1.05)'; 
            }
            cardEl.style.pointerEvents = 'none';
        });

        const selectedCardData = playerHand[handIndex];
        if(playedCardZoneElement) playedCardZoneElement.innerHTML = ''; 
        if(abilityChoiceButtonsElement) abilityChoiceButtonsElement.innerHTML = '';
        if(abilityChoiceButtonsElement) abilityChoiceButtonsElement.style.display = 'flex';

        const playedCardElement = createCardElementDOM(selectedCardData, -1, true);
        if(playedCardZoneElement) playedCardZoneElement.appendChild(playedCardElement);
            
        selectedCardData.abilities.forEach((ability, abilityIndex) => {
            const abilityButton = document.createElement('button');
            abilityButton.innerHTML = `<i class="fas ${ability.icon || 'fa-cogs'}"></i> ${ability.name} <span class="ability-btn-desc">(${ability.description})</span>`;
            abilityButton.addEventListener('click', () => {
                executeAbility(handIndex, abilityIndex);
                if(abilityChoiceButtonsElement) abilityChoiceButtonsElement.style.display = 'none';
            });
            if(abilityChoiceButtonsElement) abilityChoiceButtonsElement.appendChild(abilityButton);
        });
        setDialogueText(`${selectedCardData.displayName}の技を選択してください。`);
    }

    function executeAbility(handIndex, abilityIndex) {
        if (handIndex < 0 || handIndex >= playerHand.length) return;

        const playedCardData = playerHand.splice(handIndex, 1)[0]; 
        if(discardPile) discardPile.push(playedCardData);
        const ability = playedCardData.abilities[abilityIndex];

        setDialogueText(`${playedCardData.displayName}：「${ability.dialogue}」`);
        
        const oldValue = currentMainNumber;
        let newValue = currentMainNumber;
        let effectValueChange = 0; 

        let currentTurnAffinityMultiplier = checkAndApplyHandAffinities(false, true);

        if (ability.effectType === "nyama_affinity_debuff") {
            newValue = oldValue + ability.baseValue; // Apply score change before affinity for this ability
            Object.keys(CHAR_IDS).forEach(charKey => {
                const charId = CHAR_IDS[charKey];
                if (charId !== CHAR_IDS.NYAMA) { 
                    if (!currentAffinityData[CHAR_IDS.NYAMA]) currentAffinityData[CHAR_IDS.NYAMA] = {};
                    currentAffinityData[CHAR_IDS.NYAMA][charId] = Math.max(MIN_AFFINITY_MULTIPLIER, (currentAffinityData[CHAR_IDS.NYAMA][charId] || 1.0) - (AFFINITY_STAGE_VALUE * 2));
                    if (!currentAffinityData[charId]) currentAffinityData[charId] = {};
                    currentAffinityData[charId][CHAR_IDS.NYAMA] = Math.max(MIN_AFFINITY_MULTIPLIER, (currentAffinityData[charId][CHAR_IDS.NYAMA] || 1.0) - (AFFINITY_STAGE_VALUE * 2));
                }
            });
            setDialogueText("にゃま：「ふふん、スコアはもらったけど…みんなちょっと冷たいかもにゃ…」", true);
            currentMainNumber = Math.max(0, Math.round(newValue)); // Apply directly
        } else if (ability.effectType === "sasami_affinity_buff_all") {
            const stages = ability.stages || 2;
            Object.values(CHAR_IDS).forEach(charId1 => {
                Object.values(CHAR_IDS).forEach(charId2 => {
                    if (charId1 !== charId2 && (charId1 === CHAR_IDS.SASAMI || charId2 === CHAR_IDS.SASAMI)) {
                        if (!currentAffinityData[charId1]) currentAffinityData[charId1] = {};
                        currentAffinityData[charId1][charId2] = Math.min(MAX_AFFINITY_MULTIPLIER, (currentAffinityData[charId1][charId2] || 1.0) + (AFFINITY_STAGE_VALUE * stages));
                    }
                });
            });
             setDialogueText("ささみ：「みんな、もっと仲良くなりましょう～♪ 私の魅力でイチコロです！」", true);
             currentMainNumber = oldValue; // No direct score change
        } else if (ability.effectType === "shirochan_gamble") {
            if (Math.random() < 0.0001) { 
                newValue = oldValue * 100; 
                setDialogueText("しろちゃん：「奇跡ですの！？力が…力が漲りますわーーーっ！！」", true);
            } else {
                newValue = 0;
            }
            currentMainNumber = Math.max(0, Math.round(newValue));
        } else if (ability.effectType === "shirochan_barrier") {
            newValue = oldValue + ability.baseValue;
            temporaryAffinityEffect = { turnsRemaining: 2, type: 'ignore_negative' }; 
            setDialogueText("しろちゃん：「聖なる光が、不和を打ち消します！」", true);
            currentMainNumber = Math.max(0, Math.round(newValue));
        } else if (ability.effectType === "yuumaru_roulette") {
            const randAction = Math.random();
            if (randAction < 0.5) newValue = oldValue + 12;
            else if (randAction < 0.9) newValue = oldValue - 6;
            else newValue = 13; 
            currentMainNumber = Math.max(0, Math.round(newValue));
        } else if (ability.effectType === "nyama_trickster") {
            if (playerHand.length >= 2) {
                const c1 = playerHand[0].id;
                const c2 = playerHand[1].id;
                const changeType = Math.random() < 0.5 ? 'buff' : 'nerf'; 
                const changeAmountAbs = (Math.floor(Math.random() * 2) + 2) * AFFINITY_STAGE_VALUE; // 0.3 or 0.45
                const changeActual = changeType === 'buff' ? changeAmountAbs : -changeAmountAbs;
                
                const originalC1C2 = currentAffinityData[c1]?.[c2] || 1.0;
                
                currentAffinityData[c1][c2] = Math.max(MIN_AFFINITY_MULTIPLIER, Math.min(MAX_AFFINITY_MULTIPLIER, originalC1C2 + changeActual));
                currentAffinityData[c2][c1] = currentAffinityData[c1][c2]; 
                
                temporaryAffinityLink = { card1Id: c1, partnerId: c2, originalMultiplierC1P: originalC1C2, originalMultiplierPC1: currentAffinityData[c2]?.[c1] || 1.0, turnsRemaining: 2 }; // Store original to revert
                setDialogueText(`にゃま：「${CHARACTERS[c1.toUpperCase()].displayName}と${CHARACTERS[c2.toUpperCase()].displayName}の仲が${changeType === 'buff' ? '急接近にゃん' : 'ちょっとギクシャク…'}！？（一時的）」`, true);
            } else {
                newValue = oldValue + 2; 
            }
            currentMainNumber = Math.max(0, Math.round(newValue));
        } else if (ability.effectType === "yuumaru_affinity_link") {
             if (playerHand.length > 0) {
                const targetCardIndex = Math.floor(Math.random() * playerHand.length);
                const targetCard = playerHand[targetCardIndex];
                let partnerCard = null;
                if (playerHand.length > 1) {
                    if (playerHand[0].uniqueId !== targetCard.uniqueId) partnerCard = playerHand[0];
                    else if (playerHand.length > 1 && playerHand[1].uniqueId !== targetCard.uniqueId) partnerCard = playerHand[1];
                }

                if (targetCard && partnerCard) {
                    const linkChange = (Math.random() < 0.5 ? 0.4 : -0.4); 
                    const originalC1P = currentAffinityData[targetCard.id]?.[partnerCard.id] || 1.0;
                    const originalPC1 = currentAffinityData[partnerCard.id]?.[targetCard.id] || 1.0;

                    currentAffinityData[targetCard.id][partnerCard.id] = Math.max(MIN_AFFINITY_MULTIPLIER, Math.min(MAX_AFFINITY_MULTIPLIER, originalC1P + linkChange));
                    currentAffinityData[partnerCard.id][targetCard.id] = currentAffinityData[targetCard.id][partnerCard.id];
                    
                    temporaryAffinityLink = { card1Id: targetCard.id, partnerId: partnerCard.id, originalMultiplierC1P, originalMultiplierPC1, turnsRemaining: 2 };
                    setDialogueText(`ゆーまる：「${targetCard.displayName}と${partnerCard.displayName}の絆が${linkChange > 0 ? '超深まった' : '超こじれた'}かも～？一時的よ！」`, true);
                }
                 newValue = oldValue + 2; 
            } else {
                 newValue = oldValue + 2;
            }
            currentMainNumber = Math.max(0, Math.round(newValue));
        } 
        else if (typeof ability.effect === 'function') { 
            newValue = ability.effect(oldValue); // Pass oldValue for calculation based on state *before* this card
            effectValueChange = newValue - oldValue;
            effectValueChange = Math.round(effectValueChange * currentTurnAffinityMultiplier);
            currentMainNumber = Math.max(0, Math.round(oldValue + effectValueChange));
        }
            
        updateMainNumberDisplay(oldValue, currentMainNumber);
        lastPlayedCharacterId = playedCardData.id; 

        if (playerHandElement) {
            playerHandElement.querySelectorAll('.card').forEach(cardEl => { 
                cardEl.style.opacity = '1';
                cardEl.style.transform = 'scale(1)';
                cardEl.style.pointerEvents = 'auto';
            });
        }
        
        setTimeout(() => {
            if (playedCardZoneElement) playedCardZoneElement.innerHTML = '<p class="zone-placeholder">カード使用済み</p>';
            renderPlayerHand(); 
            if (currentTurn < MAX_TURNS_GAME) {
                progressToNextTurn();
            } else {
                triggerGameOver();
            }
        }, 2500);
    }
    
    function updateMainNumberDisplay(oldValue, newValue) {
        let duration = 700; 
        let startTimestamp = null;
        const element = mainNumberElement;
        if (!element) return;
        applyScoreColoring(newValue); 
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const displayValue = Math.floor(progress * (newValue - oldValue) + oldValue);
            element.textContent = displayValue;
            const scaleProgress = Math.sin(progress * Math.PI); 
            element.style.transform = `scale(${1 + scaleProgress * 0.25})`;
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                 element.textContent = newValue; 
                 element.style.transform = 'scale(1)';
            }
        };
        requestAnimationFrame(step);
    }

    function applyScoreColoring(currentScore) {
        if (!mainNumberElement) return;
        SCORE_TIERS.forEach(tier => mainNumberElement.classList.remove(tier.className));
        mainNumberElement.classList.remove('increased', 'decreased'); 
        let appliedClass = SCORE_TIERS.find(tier => tier.limit === 0)?.className || 'score-tier-0-9'; 
        if (currentScore < 0) { // Should not happen with Math.max(0, ...)
            appliedClass = SCORE_TIERS.find(tier => tier.limit === -999)?.className || 'score-tier-negative';
        } else {
            for (let i = 0; i < SCORE_TIERS.length; i++) { 
                if (currentScore >= SCORE_TIERS[i].limit && SCORE_TIERS[i].limit !== -999) {
                    appliedClass = SCORE_TIERS[i].className;
                    break; 
                }
            }
        }
        mainNumberElement.classList.add(appliedClass);
    }

    function progressToNextTurn() {
        currentTurn++;
        if (temporaryAffinityEffect) {
            temporaryAffinityEffect.turnsRemaining--;
            if (temporaryAffinityEffect.turnsRemaining <= 0) {
                temporaryAffinityEffect = null;
                setDialogueText("しろちゃん：「純粋領域の効果が終了しました…」", true);
            }
        }
        if (temporaryAffinityLink) {
            temporaryAffinityLink.turnsRemaining--;
            if (temporaryAffinityLink.turnsRemaining <= 0) {
                if (currentAffinityData[temporaryAffinityLink.card1Id] && currentAffinityData[temporaryAffinityLink.partnerId]) { // Check if keys exist
                    currentAffinityData[temporaryAffinityLink.card1Id][temporaryAffinityLink.partnerId] = temporaryAffinityLink.originalMultiplierC1P;
                    currentAffinityData[temporaryAffinityLink.partnerId][temporaryAffinityLink.card1Id] = temporaryAffinityLink.originalMultiplierPC1;
                }
                setDialogueText("ゆーまる：「気まぐれリンクの効果が切れたみたい～」", true);
                temporaryAffinityLink = null;
            }
        }

        if (currentTurn <= MAX_TURNS_GAME) {
            setDialogueText(`ターン ${currentTurn}。ドロー...`);
            const deckElement = document.querySelector('.deck-pile .card-back-design');
            if (deckElement) {
                deckElement.style.transition = 'transform 0.4s var(--ease-out-cubic), opacity 0.4s var(--ease-out-cubic)';
                deckElement.style.transform = 'translateY(-40px) rotateX(70deg) scale(0.7)';
                deckElement.style.opacity = '0.5';
                 setTimeout(() => {
                    deckElement.style.transform = 'translateY(0) rotateX(0) scale(1)';
                    deckElement.style.opacity = '1';
                    const newCard = drawCardFromDeck();
                    if (newCard) {
                       renderPlayerHand(); 
                       const newCardElements = playerHandElement.querySelectorAll('.card');
                       if (newCardElements.length > 0) {
                           const addedCardIndex = playerHand.findIndex(card => card.uniqueId === newCard.uniqueId);
                           const newCardElementInHand = newCardElements[addedCardIndex];
                           if (newCardElementInHand) {
                               newCardElementInHand.classList.add('drawn-animation');
                               setTimeout(() => {
                                   if(newCardElementInHand) newCardElementInHand.classList.remove('drawn-animation');
                               }, 700);
                           }
                       }
                    }
                    setTimeout(() => setDialogueText(`ターン ${currentTurn}。手札からカードを選んでください。`), newCard ? 700 : 100);
                }, 500);
            } else { 
                 const newCard = drawCardFromDeck();
                 if (newCard) renderPlayerHand();
                 setDialogueText(`ターン ${currentTurn}。手札からカードを選んでください。`);
            }
            if(turnNumberElement) turnNumberElement.textContent = currentTurn;
        } else {
            triggerGameOver();
        }
    }

    if(challengeButton) { 
        challengeButton.addEventListener('click', () => {
            if (challengeButton.disabled) return;
            const prob = Math.random();
            let challengeResultText = "チャレンジ！ ";
            const oldValue = currentMainNumber;
            let changeAmount = 0;
            if (prob < 0.15) { changeAmount = -(Math.floor(Math.random() * 10) + 10); challengeResultText += `大失敗…コアバリューが ${Math.abs(changeAmount)} 激減！！`; } 
            else if (prob < 0.45) { changeAmount = -(Math.floor(Math.random() * 8) + 1); challengeResultText += `失敗…コアバリューが ${Math.abs(changeAmount)} 減少！`; } 
            else if (prob < 0.80) { changeAmount = Math.floor(Math.random() * 8) + 2;  challengeResultText += `成功！コアバリューが ${changeAmount} 増加！`; } 
            else { changeAmount = Math.floor(Math.random() * 10) + 10;  challengeResultText += `大成功！コアバリューが ${changeAmount} 大幅増加！！`;}
            currentMainNumber = Math.max(0, currentMainNumber + changeAmount);
            challengeResultText += ` (現在: ${currentMainNumber})`;
            setDialogueText(challengeResultText);
            updateMainNumberDisplay(oldValue, currentMainNumber);
            challengeButton.disabled = true; 
            challengeButton.style.opacity = '0.5';
            challengeButton.innerHTML = '<i class="fas fa-check"></i> 使用済み';
        });
    }
    if(redrawHandButton) {
        redrawHandButton.addEventListener('click', () => {
            if (redrawHandButton.disabled || redrawUsedThisGame) {
                setDialogueText("手札再構築は1ゲームに1回だけです！");
                return;
            }
            const cost = 10;
            if (currentMainNumber >= cost) {
                const oldValue = currentMainNumber;
                currentMainNumber -= cost;
                updateMainNumberDisplay(oldValue, currentMainNumber);

                if(discardPile) discardPile.push(...playerHand);
                playerHand = [];
                setDialogueText(`手札を再構築！ (コアバリュー -${cost})`);
                for(let i=0; i < MAX_HAND_SIZE; i++) {
                    drawCardFromDeck();
                }
                renderPlayerHand();
                updateGameCounts();
                redrawUsedThisGame = true; 
                redrawHandButton.disabled = true;
                redrawHandButton.style.opacity = '0.5';
                redrawHandButton.innerHTML = '<i class="fas fa-check"></i> 再構築済み';
            } else {
                setDialogueText(`手札再構築にはコアバリューが${cost}必要です！ (現在: ${currentMainNumber})`);
            }
        });
    }

    function setDialogueText(text, append = false) {
        if (!dialogueTextElement) return;
        if (append) {
            dialogueTextElement.innerHTML += `<br><span class="dialogue-append">${text}</span>`;
        } else {
            dialogueTextElement.style.opacity = '0';
            dialogueTextElement.style.transform = 'translateY(5px)';
            setTimeout(() => {
                dialogueTextElement.textContent = text;
                dialogueTextElement.style.opacity = '1';
                dialogueTextElement.style.transform = 'translateY(0)';
            }, 180);
        }
    }

    function updateGameCounts() {
        if (deckCountElement) deckCountElement.textContent = '∞'; 
        if (discardCountElement && discardPile) discardCountElement.textContent = discardPile.length;
        if (handCardCountElement) handCardCountElement.textContent = playerHand.length;
    }

    function checkAndApplyHandAffinities(applyDirectPenalty = false, forAbilityExecution = false) {
        if (!affinityStatusElement) return 1.0;
        
        let currentTurnAffinityMultiplier = 1.0; // Default
        affinityStatusElement.innerHTML = ''; 
        affinityStatusElement.style.display = 'none'; 
        affinityStatusElement.classList.remove('visible', 'positive', 'negative');

        if (playerHand.length < 2) return currentTurnAffinityMultiplier;

        const card1Id = playerHand[0].id;
        const card2Id = playerHand[1].id;
        
        let affinityMessage = "";
        currentTurnAffinityMultiplier = (currentAffinityData[card1Id] && currentAffinityData[card1Id][card2Id] !== undefined) 
                                ? currentAffinityData[card1Id][card2Id] 
                                : (currentAffinityData[card2Id] && currentAffinityData[card2Id][card1Id] !== undefined 
                                    ? currentAffinityData[card2Id][card1Id] 
                                    : 1.0);

        if (temporaryAffinityEffect && temporaryAffinityEffect.type === 'ignore_negative' && currentTurnAffinityMultiplier < 1.0) {
            affinityMessage = `<i class="fas fa-shield-alt"></i> しろちゃんの純粋領域が発動中！悪い相性を無効化！ (効果x1.0)`;
            currentTurnAffinityMultiplier = 1.0;
            if (affinityStatusElement) affinityStatusElement.classList.add('positive'); 
        } else if (temporaryAffinityLink && temporaryAffinityLink.turnsRemaining > 0 && 
                   ((temporaryAffinityLink.card1Id === card1Id && temporaryAffinityLink.partnerId === card2Id) ||
                    (temporaryAffinityLink.card1Id === card2Id && temporaryAffinityLink.partnerId === card1Id))) {
            currentTurnAffinityMultiplier = Math.max(MIN_AFFINITY_MULTIPLIER, Math.min(MAX_AFFINITY_MULTIPLIER, currentTurnAffinityMultiplier + temporaryAffinityLink.modifier));
            affinityMessage = `ゆーまるの気まぐれリンク発動中！ 相性x${currentTurnAffinityMultiplier.toFixed(1)}に変動！<br>`;
        }
        
        const affinityInfo = getAffinityDisplayInfo(currentTurnAffinityMultiplier);
        // Only build basic affinity message if no special effect message already set
        if (currentTurnAffinityMultiplier !== 1.0 && !affinityMessage.includes("純粋領域") && !affinityMessage.includes("気まぐれリンク")) {
             affinityMessage = `<i class="${affinityInfo.icon}"></i> ${CHARACTERS[card1Id.toUpperCase()]?.displayName || card1Id} と ${CHARACTERS[card2Id.toUpperCase()]?.displayName || card2Id}: ${affinityInfo.text} (効果x${currentTurnAffinityMultiplier.toFixed(1)})`;
        }
        
        if(affinityStatusElement && currentTurnAffinityMultiplier !== 1.0) { // Only add class if not neutral
            if(currentTurnAffinityMultiplier > 1.0) affinityStatusElement.classList.add('positive');
            else if (currentTurnAffinityMultiplier < 1.0) affinityStatusElement.classList.add('negative');
        }
        
        if (affinityMessage && !forAbilityExecution) { // Only show general affinity if not called for specific ability calc
            affinityStatusElement.innerHTML = affinityMessage;
            affinityStatusElement.style.display = 'flex'; 
            affinityStatusElement.classList.add('visible');
            setTimeout(() => { 
                if(affinityStatusElement) {
                    affinityStatusElement.style.opacity = '0'; 
                    setTimeout(()=> {
                        affinityStatusElement.style.display = 'none';
                        affinityStatusElement.innerHTML = '';
                        affinityStatusElement.style.opacity = '1'; 
                        affinityStatusElement.classList.remove('visible', 'positive', 'negative');
                    }, 300); 
                }
            }, 4000);
        } else if (!affinityMessage && !forAbilityExecution) { 
             if(affinityStatusElement) affinityStatusElement.style.display = 'none';
        }
        return currentTurnAffinityMultiplier; 
    }
    
    function triggerGameOver() {
        setDialogueText("ゲーム終了！お疲れ様でした。");
        if (finalScoreValueElementOnResult) finalScoreValueElementOnResult.textContent = currentMainNumber;
        
        const rankInfo = getRankInfoByScore(currentMainNumber); 
        if(rankIconDisplayElement) {
            rankIconDisplayElement.className = `rank-icon-display rank-${rankInfo.cssClass}`;
            rankIconDisplayElement.innerHTML = `<i class="${rankInfo.icon}"></i>`;
        }
        if(rankTitleDisplayElement) rankTitleDisplayElement.textContent = rankInfo.title;
        if(rankMessageDisplayElement) rankMessageDisplayElement.textContent = rankInfo.message;

        if (gameOverModal) {
            gameOverModal.style.opacity = '0';
            gameOverModal.style.display = 'flex';
            setTimeout(() => {
                if (gameOverModal) gameOverModal.style.opacity = '1';
            }, 50);
        }
        if (challengeButton) challengeButton.disabled = true;
        if (redrawHandButton) redrawHandButton.disabled = true;
    }
    
    function buildAffinityTable() {
        if(!affinityTableContainer) return;
        let tableHTML = '<table class="affinity-table"><thead><tr><th><i class="fas fa-users"></i></th>';
        const charIdsInOrder = Object.values(CHAR_IDS); 
        
        charIdsInOrder.forEach(charId => {
            const character = CHARACTERS[charId];
            tableHTML += `<th>${character ? character.displayName : charId}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        charIdsInOrder.forEach(rowCharId => {
            const rowChar = CHARACTERS[rowCharId];
            tableHTML += `<tr><td><span class="char-name-in-table">${rowChar ? rowChar.displayName : rowCharId}</span></td>`;
            charIdsInOrder.forEach(colCharId => {
                if (rowCharId === colCharId) {
                    tableHTML += `<td><span class="affinity-text-neutral">-</span></td>`;
                } else {
                    const multiplier = (currentAffinityData[rowCharId] && currentAffinityData[rowCharId][colCharId] !== undefined)
                                     ? currentAffinityData[rowCharId][colCharId]
                                     : 1.0; 
                    const displayInfo = getAffinityDisplayInfo(multiplier);
                    tableHTML += `<td><i class="${displayInfo.icon} affinity-icon"></i> <span class="${displayInfo.class}">${displayInfo.text} (${multiplier.toFixed(1)})</span></td>`;
                }
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        affinityTableContainer.innerHTML = tableHTML;
    }

    function getRankInfoByScore(finalScore) { 
        let rankInfo = { title: "評価中...", message: "お疲れ様でした！", icon: "fas fa-question-circle", cssClass: "d" }; 
        if (finalScore >= 60) { 
            rankInfo = { title: "中毒お疲れ様です🤡", message: "このスコア…あなたの人生、このゲームに捧げましたね？真のネクサス・コア・マスター…いや、コアそのものだ！", icon: 'fas fa-infinity', cssClass: 'godlike' };
        } else if (finalScore >= 45) { 
            rankInfo = { title: "コアの錬金術師", message: "驚異的！あなたはコアバリューを自由自在に操る天才錬金術師ですね！", icon: 'fas fa-flask-potion', cssClass: 'ss' };
        } else if (finalScore >= 30) { 
            rankInfo = { title: "戦略の魔術師", message: "見事な戦略と強運！あなたはカードゲームの申し子ですね！", icon: 'fas fa-crown', cssClass: 's' };
        } else if (finalScore >= 20) { 
            rankInfo = { title: "エリート・シナジスト", message: "素晴らしい戦績です！相乗効果を最大限に引き出しましたね！", icon: 'fas fa-puzzle-piece', cssClass: 'a_plus' };
        } else if (finalScore >= 10) { 
            rankInfo = { title: "かなりの策士", message: "良い結果ですね！数々の困難を乗り越え、確実に成果を出しました！", icon: 'fas fa-lightbulb', cssClass: 'a' };
        } else if (finalScore >= 1) { 
            rankInfo = { title: "堅実派？それとも…？", message: "プラススコア達成！安定した運用、見事です。次なる飛躍に期待！…もしかして、めちゃくちゃ慎重だっただけでは？", icon: 'fas fa-shield-alt', cssClass: 'b_plus' };
        } else if (finalScore === 0) { 
            rankInfo = { title: "結果、プラマイゼロの人", message: "おっと、スコアは原点回帰！まるで何も起きなかったかのよう…ある意味平和ですが、次は爪痕を！いや、むしろゼロは才能？", icon: 'fas fa-recycle', cssClass: 'b' };
        } else if (finalScore >= -9) { 
            rankInfo = { title: "ちょっぴり空回り気味？", message: "うーん、今回は運に見放されたかな？大丈夫、そんな日もあります。次こそは大当たりを！…って、パチンコじゃないんですよ？", icon: 'fas fa-compact-disc fa-spin', cssClass: 'c_plus' };
        } else if (finalScore >= -19) { 
            rankInfo = { title: "大胆不敵な空振り王", message: "果敢に攻めた結果のマイナス…その心意気や良し！ただし、バットにはボールを当てましょうね。話はそれからだ。", icon: 'fas fa-baseball-bat-ball', cssClass: 'c' }; 
        } else if (finalScore >= -29) { 
            rankInfo = { title: "逆神様、本日も絶好調", message: "ここまでくると逆に清々しい！あなたが選ばなかった方が常に正解なのでは…？その能力、別のゲームで活かせるかも！本当に！", icon: 'fas fa-poo', cssClass: 'd_plus' };
        } else {  
            rankInfo = { title: "破滅的エンターテイナー", message: "…素晴らしいマイナススコア、記録更新おめでとうございます（白目）。あなたは世界の終わりを見届けたのですね…。さぁ、転生しましょう！次のゲームで！", icon: 'fas fa-theater-masks', cssClass: 'd' }; 
        }
        return rankInfo;
    }

    if (restartGameButton) {
        restartGameButton.addEventListener('click', () => {
            if (gameOverModal) {
                 gameOverModal.style.opacity = '0';
                 setTimeout(() => { if(gameOverModal) gameOverModal.style.display = 'none';}, 300);
            }
             if (preGameOptionsScreen && appContainer) { 
                preGameOptionsScreen.classList.remove('hidden');
                preGameOptionsScreen.style.display = 'flex';
                appContainer.style.display = 'none';
            } else { 
                initializeGame(); 
            }
        });
    }
    if (affinityCheckButton && affinityModal && closeAffinityModalButton) {
        affinityCheckButton.addEventListener('click', () => {
            buildAffinityTable();
            if(affinityModal) {
                affinityModal.style.opacity = '0';
                affinityModal.style.display = 'flex';
                setTimeout(() => { if(affinityModal) affinityModal.style.opacity = '1'; }, 50);
            }
        });
        closeAffinityModalButton.addEventListener('click', () => {
            if(affinityModal) affinityModal.style.opacity = '0';
            setTimeout(() => { if(affinityModal) affinityModal.style.display = 'none'; }, 300);
        });
        if(affinityModal) {
            affinityModal.addEventListener('click', (event) => {
                if (event.target === affinityModal) {
                    if(closeAffinityModalButton) closeAffinityModalButton.click();
                }
            });
        }
    }

    function initializeGame() {
        deepCopyAffinityData(); 
        setupBaseDrawProbabilities();
        adjustShirochanDrawRate(); // Apply option effect to draw probabilities

        playerHand = [];
        discardPile = [];
        currentMainNumber = reduceShirochanRateGlobal ? 10 : 0; 
        currentTurn = 1;
        temporaryAffinityEffect = null;
        temporaryAffinityLink = null;
        redrawUsedThisGame = false; 
        if (redrawHandButton) { 
            redrawHandButton.disabled = false;
            redrawHandButton.style.opacity = '1';
            redrawHandButton.innerHTML = '<i class="fas fa-random"></i> 手札再構築 (-10)';
        }
        
        for(let i=0; i < MAX_HAND_SIZE; i++) {
            drawCardFromDeck(); 
        }
        renderPlayerHand(); 
        
        if (turnNumberElement) turnNumberElement.textContent = currentTurn;
        if (maxTurnsElement) maxTurnsElement.textContent = MAX_TURNS_GAME;
        if (mainNumberElement) {
            mainNumberElement.textContent = currentMainNumber;
            applyScoreColoring(currentMainNumber); 
            mainNumberElement.classList.remove('increased', 'decreased');
            mainNumberElement.style.transform = 'scale(1)';
        }
        
        if (challengeButton) {
            challengeButton.disabled = false;
            challengeButton.style.opacity = '1';
            challengeButton.innerHTML = '<i class="fas fa-dice-d20"></i> チャレンジ';
        }

        setDialogueText("ゲーム開始！手札からカードを選ぼう。");
        if (gameOverModal) gameOverModal.style.display = 'none';
        if (playedCardZoneElement) playedCardZoneElement.innerHTML = '<p class="zone-placeholder">カードを選択してください</p>';
        if (abilityChoiceButtonsElement) abilityChoiceButtonsElement.style.display = 'none';
        if (affinityStatusElement) affinityStatusElement.style.display = 'none';
        updateGameCounts();
    }

    // Start by showing pre-game options screen
    if (preGameOptionsScreen && startGameWithOptionsButton) {
        preGameOptionsScreen.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
    } else { // Fallback if pre-game screen elements are not found
        initializeGame();
    }
});
