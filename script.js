document.addEventListener('DOMContentLoaded', () => {
    const playerHandElement = document.getElementById('player-hand');
    const playedCardZoneElement = document.getElementById('played-card-zone');
    const dialogueTextElement = document.getElementById('dialogue-text');
    const challengeButton = document.getElementById('challenge-button');
    const turnNumberElement = document.getElementById('turn-number');
    const maxTurnsElement = document.getElementById('max-turns');
    const mainNumberElement = document.getElementById('main-number');
    const deckCountElement = document.getElementById('deck-count');
    const discardCountElement = document.getElementById('discard-count');

    const gameOverModal = document.getElementById('game-over-modal');
    const gameOverTitleElement = document.getElementById('game-over-title');
    const gameOverMessageElement = document.getElementById('game-over-message');
    const finalScoreValueElement = document.getElementById('final-score-value');
    const restartGameButton = document.getElementById('restart-game-button');

    const CHARACTERS = {
        NYAMA: { id: "nyama", displayName: "にゃま", colorClass: "char-nyama", icon: "fas fa-cat",
            abilities: [
                { name: "ねこ倍打", dialogue: "にゃー！数値が倍になるにゃ！", effect: (num) => num * 2, description: "数値を2倍" },
                { name: "癒やし肉球", dialogue: "ふにゃ～…ちょっとだけ増やすにゃ。", effect: (num) => num + 3, description: "+3" }
            ]},
        NANKU: { id: "nanku", displayName: "なんく", colorClass: "char-nanku", icon: "fas fa-brain",
            abilities: [
                { name: "冷静沈着", dialogue: "ふむ、ここは着実に…。", effect: (num) => num + 5, description: "+5" },
                { name: "精密減算", dialogue: "計画通り、数値を調整。", effect: (num) => Math.max(0, num - 2), description: "-2 (最低0)" }
            ]},
        SHIROCHAN: { id: "shirochan", displayName: "しろちゃん", colorClass: "char-shirochan", icon: "fas fa-dragon", // User wanted fas fa-dragon before
            abilities: [
                { name: "聖なる守護", dialogue: "この数値は私が守ります！", effect: (num) => num + 10, description: "+10 (守り)" },
                { name: "エンジェルビーム", dialogue: "全てを浄化します…少しだけね。", effect: (num) => Math.floor(num / 2), description: "数値を半分 (切り捨て)" }
            ]},
        YUUMARU: { id: "yuumaru", displayName: "ゆーまる", colorClass: "char-yuumaru", icon: "fas fa-ghost",
            abilities: [
                { name: "いたずら変化", dialogue: "えいっ！変わっちゃえ～！", effect: (num) => num + Math.floor(Math.random() * 6) - 2, description: "ランダム変化 (-2～+3)" },
                { name: "気まぐれブースト", dialogue: "今日はノってるかも！", effect: (num) => num + 7, description: "+7" }
            ]}
    };

    // 将来的に結合強度で効果が変わるなどのためのデータ構造（今回は未使用）
    const BONDING_STRENGTH = {
        [CHARACTERS.NYAMA.id]: { [CHARACTERS.NANKU.id]: 1.2, [CHARACTERS.SHIROCHAN.id]: 0.9 },
        // 他のキャラクター間の相性も定義可能
    };

    let deck = [];
    let playerHand = [];
    let discardPile = [];
    let currentMainNumber = 0;
    let currentTurn = 1;
    const MAX_TURNS = 5;

    function createDeck() {
        deck = [];
        const characters = Object.values(CHARACTERS);
        // 各キャラクターのカードを4枚ずつデッキに入れる (例)
        for (let i = 0; i < 4; i++) {
            characters.forEach(char => deck.push({ ...char, uniqueId: `<span class="math-inline">\{char\.id\}\-</span>{i}` }));
        }
        shuffleDeck();
    }

    function shuffleDeck() {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    function drawCard() {
        if (deck.length > 0) {
            const drawnCard = deck.pop();
            playerHand.push(drawnCard);
            return drawnCard;
        }
        // もし山札がなくなったら、捨て札をシャッフルして山札に戻す（今回は省略）
        setDialogue("山札がありません！");
        return null;
    }

    function renderHand() {
        playerHandElement.innerHTML = '';
        playerHand.forEach((cardData, index) => {
            const cardElement = createCardElement(cardData, index);
            playerHandElement.appendChild(cardElement);
        });
        updateCounts();
    }
    
    function createCardElement(cardData, handIndex = -1, isPlayed = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${cardData.colorClass || ''}`;
        if (isPlayed) cardDiv.classList.add('played-card');
    
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';
    
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        cardFront.innerHTML = `
            <div class="card-name"><span class="math-inline">\{cardData\.displayName\}</div\>
<i class\="</span>{cardData.icon} card-character-icon"></i>
            <div class="card-ability-preview">
                技1: ${cardData.abilities[0].description}<br>
                技2: ${cardData.abilities[1].description}
            </div>
        `;
    
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back-face';
        cardBack.textContent = cardData.displayName.substring(0,1).toUpperCase(); // Placeholder back
    
        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        cardDiv.appendChild(cardInner);
    
        if (handIndex !== -1 && !isPlayed) { // Only add click to play for cards in hand
            cardDiv.dataset.handIndex = handIndex;
            cardDiv.addEventListener('click', () => selectCardToPlay(handIndex));
        }
        return cardDiv;
    }
    
    function selectCardToPlay(handIndex) {
        const selectedCardData = playerHand[handIndex];
        playedCardZoneElement.innerHTML = ''; // Clear previous
    
        const playedCardElement = createCardElement(selectedCardData, -1, true);
        playedCardZoneElement.appendChild(playedCardElement);
        // Trigger flip animation for the played card
        setTimeout(() => playedCardElement.classList.add('is-flipping'), 50); 
    
        const abilitiesDiv = document.createElement('div');
        abilitiesDiv.className = 'ability-choices';
        selectedCardData.abilities.forEach((ability, abilityIndex) => {
            const abilityButton = document.createElement('button');
            abilityButton.textContent = ability.name;
            abilityButton.addEventListener('click', () => {
                playAbility(handIndex, abilityIndex);
            });
            abilitiesDiv.appendChild(abilityButton);
        });
        playedCardZoneElement.appendChild(abilitiesDiv);
        setDialogue(`${selectedCardData.displayName}の技を選んでください。`);
    }

    function playAbility(handIndex, abilityIndex) {
        const playedCardData = playerHand.splice(handIndex, 1)[0]; // Remove from hand
        discardPile.push(playedCardData);
        const ability = playedCardData.abilities[abilityIndex];

        setDialogue(`<span class="math-inline">\{playedCardData\.displayName\}：「</span>{ability.dialogue}」`);
        
        // Animate main number change
        const oldNumber = currentMainNumber;
        currentMainNumber = ability.effect(currentMainNumber);
        animateMainNumber(oldNumber, currentMainNumber);

        playedCardZoneElement.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">カード使用済み</p>'; // Clear played card zone after use
        
        renderHand();
        if (currentTurn < MAX_TURNS) {
            startNextTurn();
        } else {
            endGame();
        }
    }
    
    function animateMainNumber(oldValue, newValue) {
        let duration = 600;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const displayValue = Math.floor(progress * (newValue - oldValue) + oldValue);
            mainNumberElement.textContent = displayValue;
            mainNumberElement.style.transform = `scale(${1 + progress * 0.1})`; // Scale up
            mainNumberElement.style.color = progress < 0.5 ? var(--accent-yellow) : (newValue > oldValue ? var(--accent-green) : var(--accent-pink));

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                 mainNumberElement.textContent = newValue; // Ensure final value is set
                 mainNumberElement.style.transform = 'scale(1)';
                 mainNumberElement.style.color = var(--accent-yellow); // Reset color
            }
        };
        requestAnimationFrame(step);
    }


    function startNextTurn() {
        currentTurn++;
        if (currentTurn <= MAX_TURNS) {
            setDialogue(`ターン ${currentTurn}。カードを1枚引きます。`);
            // Flip animation for drawing (visual only, card is added instantly)
            const deckElement = document.querySelector('.deck-pile .card-back');
            if (deckElement) {
                deckElement.style.transition = 'transform 0.5s var(--ease-out-cubic)';
                deckElement.style.transform = 'translateY(-30px) rotateX(70deg) scale(0.8)';
                 setTimeout(() => {
                    deckElement.style.transform = 'translateY(0) rotateX(0) scale(1)';
                    const newCard = drawCard();
                    if (newCard) {
                       renderHand(); // Redraw hand with new card
                       // Add "drawn" animation to the new card in hand
                       const newCardElement = playerHandElement.lastChild;
                       if(newCardElement) {
                           newCardElement.style.opacity = '0';
                           newCardElement.style.transform = 'translateY(20px) scale(0.8)';
                           setTimeout(() => {
                               newCardElement.style.opacity = '1';
                               newCardElement.style.transform = 'translateY(0) scale(1)';
                           }, 50);
                       }
                    }
                }, 500);
            } else { // Fallback if deck element not found for animation
                 const newCard = drawCard();
                 if (newCard) renderHand();
            }
            turnNumberElement.textContent = currentTurn;
        } else {
            endGame();
        }
    }

    challengeButton.addEventListener('click', () => {
        const prob = Math.random();
        let challengeResultText = "チャレンジ！ ";
        const oldValue = currentMainNumber;
        if (prob < 0.33) { // 33% chance fail
            const decrease = Math.floor(Math.random() * 5) + 1;
            currentMainNumber = Math.max(0, currentMainNumber - decrease);
            challengeResultText += `失敗…数値が ${decrease} 減った！ (現在: ${currentMainNumber})`;
        } else if (prob < 0.66) { // 33% chance small success
            const increase = Math.floor(Math.random() * 3) + 1;
            currentMainNumber += increase;
            challengeResultText += `小成功！数値が ${increase} 増えた！ (現在: ${currentMainNumber})`;
        } else { // 34% chance big success
            const increase = Math.floor(Math.random() * 5) + 3; // 3 to 7
            currentMainNumber += increase;
            challengeResultText += `大成功！数値が ${increase} 増えた！ (現在: ${currentMainNumber})`;
        }
        setDialogue(challengeResultText);
        animateMainNumber(oldValue, currentMainNumber);
        challengeButton.disabled = true; // Use challenge once per game for simplicity
        challengeButton.style.opacity = '0.5';
    });


    function setDialogue(text) {
        dialogueTextElement.style.opacity = '0';
        setTimeout(() => {
            dialogueTextElement.textContent = text;
            dialogueTextElement.style.opacity = '1';
        }, 150);
    }

    function updateCounts() {
        deckCountElement.textContent = deck.length;
        discardCountElement.textContent = discardPile.length;
    }
    
    function endGame() {
        setDialogue("ゲーム終了！お疲れ様でした。");
        finalScoreValueElement.textContent = currentMainNumber;
        gameOverModal.style.display = 'flex'; // Show modal
        // Disable challenge button if not already
        challengeButton.disabled = true;
        challengeButton.style.opacity = '0.5';
    }

    restartGameButton.addEventListener('click', () => {
        gameOverModal.style.display = 'none';
        startGame();
    });

    function startGame() {
        createDeck();
        playerHand = [];
        discardPile = [];
        currentMainNumber = 0; // Initial number
        currentTurn = 1;
        
        // Initial deal
        drawCard();
        drawCard();
        renderHand();
        
        turnNumberElement.textContent = currentTurn;
        maxTurnsElement.textContent = MAX_TURNS;
        mainNumberElement.textContent = currentMainNumber;
        challengeButton.disabled = false;
        challengeButton.style.opacity = '1';

        setDialogue("ゲーム開始！手札からカードを選んで技を使おう。");
        if (gameOverModal) gameOverModal.style.display = 'none';
        playedCardZoneElement.innerHTML = '<p style
