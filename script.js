document.addEventListener('DOMContentLoaded', () => {
    const messageTextContentElement = document.getElementById('message-text-content');
    const choicesAreaElement = document.getElementById('choices-area');
    const feedbackTextElement = document.getElementById('feedback-text');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const quizAreaElement = document.getElementById('quiz-area');
    const resultAreaElement = document.getElementById('result-display-area');
    const restartBtn = document.getElementById('restart-game-button');
    const progressBarElement = document.getElementById('progress-bar');
    const progressTextElement = document.getElementById('progress-text');
    const currentScoreValueElement = document.getElementById('current-score-value');
    const currentScoreDisplayElement = document.querySelector('.current-score-display');
    
    const attributedSpeakerNameElement = document.getElementById('attributed-speaker-name');
    const attributionQuestionArea = document.getElementById('attribution-question');

    const prevMessageContainer = document.getElementById('prev-message-container');
    const prevSpeakerNameElement = document.getElementById('prev-speaker-name');
    const prevMessageTextElement = document.getElementById('prev-message-text');
    const nextMessageContainer = document.getElementById('next-message-container');
    const nextSpeakerNameElement = document.getElementById('next-speaker-name');
    const nextMessageTextElement = document.getElementById('next-message-text');

    const rankIconDisplayElement = document.getElementById('rank-icon-display');
    const rankTitleDisplayElement = document.getElementById('rank-title-display');
    const finalScoreValueElementOnResult = gameOverModal.querySelector('#final-score-value');
    const totalQuestionsOnResultElement = gameOverModal.querySelector('#total-questions-on-result'); // For game over modal
    const rankMessageDisplayElement = document.getElementById('rank-message-display');
    
    const appContainer = document.querySelector('.app-container');
    const preGameOptionsScreen = document.getElementById('pre-game-options-screen');
    const startGameWithOptionsButton = document.getElementById('start-game-with-options-button');
    const lowerShirochanRateCheckbox = document.getElementById('lower-shirochan-rate-checkbox');

    let allQuizData = []; 
    let currentQuizSet = []; 
    let currentQuestionIndex = 0;
    let score = 0; 
    const TARGET_NUM_QUESTIONS = 10; 
    const QUIZ_DATA_FILE = "misattributed_context_quiz_data.json"; 

    let lastActualSpeakerId = null; 
    let reduceShirochanRateGlobal = false; 
    
    // CHAR_IDS and CHARACTERS would be defined here if this were the card game.
    // For the "Misattributed Quote Quiz", we don't need them in JS directly
    // as the JSON provides all speaker info.
    // However, for the Nyanma -> Shirochan combo, we need their display names.
    const NYANMA_DISPLAY_NAME = "にゃま"; // Or however it's set in CHOICE_DISPLAY_NAME_MAP
    const SHIROCHAN_DISPLAY_NAME = "しろちゃん"; // Or however it's set in CHOICE_DISPLAY_NAME_MAP

    const SCORE_TIERS = [
        { limit: 40, className: 'score-tier-40plus' }, { limit: 30, className: 'score-tier-30-39' },
        { limit: 20, className: 'score-tier-20-29' }, { limit: 10, className: 'score-tier-10-19' },
        { limit: 0,  className: 'score-tier-0-9' },    { limit: -999, className: 'score-tier-negative' } 
    ];

    // --- Card Game Specific Data (If we were to switch back) ---
    // const CHAR_IDS_CARD_GAME = { NYAMA: "nyama", NANKU: "nanku", SHIROCHAN: "shirochan", YUUMARU: "yuumaru", SASAMI: "sasami" };
    // const CHARACTERS_CARD_GAME = { /* ... card data ... */ };
    // let currentAffinityData = {};
    // const AFFINITY_DATA_BASE = { /* ... affinity data ... */ };
    // etc.
    // For this "Misattributed Quote Quiz", this section is not active.


    async function initializeQuizApp() { 
        if (preGameOptionsScreen) preGameOptionsScreen.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none'; 
        
        if (startGameWithOptionsButton) {
            startGameWithOptionsButton.addEventListener('click', () => {
                if (lowerShirochanRateCheckbox) {
                    reduceShirochanRateGlobal = lowerShirochanRateCheckbox.checked;
                }
                if (preGameOptionsScreen) {
                    preGameOptionsScreen.classList.add('hidden'); 
                    setTimeout(() => {
                        if(preGameOptionsScreen) preGameOptionsScreen.style.display = 'none'; 
                        if (appContainer) appContainer.style.display = 'flex'; 
                        loadDataAndStartGame(); 
                    }, 500); 
                } else { 
                    loadDataAndStartGame();
                }
            });
        } else { 
             loadDataAndStartGame(); // Directly load if no pre-game screen
        }
    }
    
    async function loadDataAndStartGame(){
        try {
            const response = await fetch(QUIZ_DATA_FILE);
            if (!response.ok) throw new Error(`HTTP error! Quiz data (${QUIZ_DATA_FILE}) not found. Status: ${response.status}`);
            allQuizData = await response.json(); 
            if (!Array.isArray(allQuizData) || allQuizData.length === 0) {
                displayError("クイズデータが見つからないか、形式が不適切です。");
                return;
            }
            prepareNewQuizSet(); 
            startGame();
        } catch (error) {
            console.error("クイズデータの読み込みまたは初期化に失敗:", error);
            displayError(`クイズの読み込みに失敗: ${error.message}.`);
        }
    }


    function prepareNewQuizSet() {
        let shuffledData = shuffleArray([...allQuizData]); 
        currentQuizSet = shuffledData.slice(0, TARGET_NUM_QUESTIONS); 
        if (currentQuizSet.length === 0 && allQuizData.length > 0) {
             currentQuizSet = shuffledData.slice(0, allQuizData.length); 
        }
    }
    
    function displayError(message) { 
        if (quizAreaElement) {
            quizAreaElement.innerHTML = `<p class="error-message">${message}</p>`;
            quizAreaElement.style.display = 'block';
        }
        if (resultAreaElement) resultAreaElement.style.display = 'none';
        const header = document.querySelector('.quiz-header');
        if(header) header.style.display = 'none';
        if (preGameOptionsScreen && !preGameOptionsScreen.classList.contains('hidden')) {
            preGameOptionsScreen.style.display = 'none';
        }
    }

    function startGame() {
        currentQuestionIndex = 0;
        score = reduceShirochanRateGlobal ? 10 : 0;
        lastActualSpeakerId = null; 
        
        if(currentScoreValueElement) {
            currentScoreValueElement.textContent = score.toString();
            applyScoreColoring(score); 
        }
        if(currentScoreDisplayElement) currentScoreDisplayElement.classList.remove('score-updated');
        
        if (resultAreaElement) resultAreaElement.style.display = 'none';
        const resultCard = document.querySelector('.result-card');
        if(resultCard) { 
            resultCard.style.opacity = '0';
            resultCard.style.transform = 'translateY(30px) scale(0.95)';
            resultCard.style.animation = 'none'; 
            resultCard.offsetHeight; 
            resultCard.style.animation = ''; 
        }
        
        if (quizAreaElement) quizAreaElement.style.display = 'block';
        if(attributionQuestionArea) attributionQuestionArea.style.display = 'block'; 
        if(choicesAreaElement) choicesAreaElement.className = 'choices-container binary-choices'; 

        if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';
        if (feedbackTextElement) {
            feedbackTextElement.textContent = '';
            feedbackTextElement.className = 'feedback-text'; 
        }
        
        if (currentQuizSet.length === 0) {
            prepareNewQuizSet(); 
            if (currentQuizSet.length === 0) { 
                 displayError("出題できるクイズがありません。");
                 return;
            }
        }
        updateProgress();
        displayQuestion();
    }

    function displayQuestion() {
        if(feedbackTextElement) feedbackTextElement.className = 'feedback-text';

        if (currentQuestionIndex < currentQuizSet.length) {
            const q = currentQuizSet[currentQuestionIndex];
            
            if (prevMessageContainer && prevSpeakerNameElement && prevMessageTextElement) {
                if (q.prev_message_text) {
                    prevSpeakerNameElement.textContent = q.prev_speaker_display || "";
                    prevMessageTextElement.innerHTML = q.prev_message_text.replace(/\n/g, '<br>');
                    prevMessageContainer.style.display = 'block';
                } else {
                    prevMessageContainer.style.display = 'none';
                    prevSpeakerNameElement.textContent = "";
                    prevMessageTextElement.innerHTML = "";
                }
            }

            if(messageTextContentElement) {
                if (q.main_quote_text) {
                    messageTextContentElement.innerHTML = q.main_quote_text.replace(/\n/g, '<br>');
                } else {
                    messageTextContentElement.innerHTML = "[クイズ文の読み込みエラー]"; 
                }
            }
            
            if (nextMessageContainer && nextSpeakerNameElement && nextMessageTextElement) {
                if (q.next_message_text) {
                    nextSpeakerNameElement.textContent = q.next_speaker_display || "";
                    nextMessageTextElement.innerHTML = q.next_message_text.replace(/\n/g, '<br>');
                    nextMessageContainer.style.display = 'block';
                } else if (nextMessageContainer) { 
                    nextMessageContainer.style.display = 'none';
                    if(nextSpeakerNameElement) nextSpeakerNameElement.textContent = "";
                    if(nextMessageTextElement) nextMessageTextElement.innerHTML = "";
                }
            }
            
            if(attributedSpeakerNameElement) attributedSpeakerNameElement.textContent = q.attributed_speaker_display;
            if(attributionQuestionArea) attributionQuestionArea.style.display = 'block';
            
            if (choicesAreaElement) choicesAreaElement.innerHTML = ''; 
            const yesButton = document.createElement('button');
            yesButton.innerHTML = `<span>はい、この人の発言！</span>`;
            yesButton.dataset.answer = "yes";
            yesButton.addEventListener('click', () => handleAnswer("yes"));
            if (choicesAreaElement) choicesAreaElement.appendChild(yesButton);

            const noButton = document.createElement('button');
            noButton.innerHTML = `<span>いいえ、違う人の発言！</span>`;
            noButton.dataset.answer = "no";
            noButton.addEventListener('click', () => handleAnswer("no"));
            if (choicesAreaElement) choicesAreaElement.appendChild(noButton);
            
            if(nextQuestionBtn) nextQuestionBtn.style.display = 'none';
        } else {
            showResults();
        }
    }

    function handleAnswer(userYesNoChoice) { 
        const currentQuestion = currentQuizSet[currentQuestionIndex];
        const isCorrectAttribution = currentQuestion.is_attribution_correct;
        const attributedSpeaker = currentQuestion.attributed_speaker_display;
        const actualSpeaker = currentQuestion.main_quote_actual_speaker_display;
        
        let pointsEarned = 0;

        if (choicesAreaElement) {
            const buttons = choicesAreaElement.getElementsByTagName('button');
            for (let btn of buttons) {
                btn.disabled = true;
            }
        }
        
        let answeredCorrectly = false;

        if (userYesNoChoice === "yes") {
            answeredCorrectly = isCorrectAttribution;
        } else if (userYesNoChoice === "no") {
            answeredCorrectly = !isCorrectAttribution;
        }
        
        let comboDebuffMessage = "";
        // 「にゃま」の表示名と「しろちゃん」の表示名は、CHOICE_DISPLAY_NAME_MAPに基づきます。
        // Python側で生成されるJSONの actual_speaker_display を使うのが確実。
        if (actualSpeaker === SHIROCHAN_DISPLAY_NAME && lastActualSpeakerId === NYANMA_DISPLAY_NAME) { 
            comboDebuffActive = true; 
            // このクイズモードでは、ポイント自体はシンプルに+1 or 0のため、
            // デバフはメッセージでの示唆に留めます。
             comboDebuffMessage = "<br><span class='debuff-hint'>(…しかし、しろちゃん、にゃまさんの直後でなぜか少し調子が悪そう…？)</span>";
        }


        if (answeredCorrectly) {
            pointsEarned = 1; 
            score += pointsEarned;
            if (feedbackTextElement) {
                feedbackTextElement.innerHTML = `正解！ +${pointsEarned}点 ${comboDebuffMessage} 🎉`;
            }
        } else {
            pointsEarned = 0; 
            if (feedbackTextElement) {
                if (userYesNoChoice === "yes") { 
                    feedbackTextElement.textContent = `残念…！これは ${attributedSpeaker} さんの発言ではありませんでした。本当は ${actualSpeaker} さんのセリフです。`;
                } else { 
                    feedbackTextElement.textContent = `ありゃ、これは本当に ${attributedSpeaker} さんの発言だったんですよ。`;
                }
            }
        }
        
        if(currentScoreValueElement) {
            currentScoreValueElement.textContent = score;
            applyScoreColoring(score); 
        }
        if(currentScoreDisplayElement) {
            currentScoreDisplayElement.classList.add('score-updated');
            setTimeout(() => currentScoreDisplayElement.classList.remove('score-updated'), 300);
        }

        if (feedbackTextElement) feedbackTextElement.className = 'feedback-text visible'; 
        if (answeredCorrectly) {
            if (feedbackTextElement) feedbackTextElement.classList.add('correct');
            if (choicesAreaElement) Array.from(choicesAreaElement.getElementsByTagName('button')).find(btn => btn.dataset.answer === userYesNoChoice)?.classList.add('correct');
            if (typeof confetti === 'function' && currentQuestionIndex < TARGET_NUM_QUESTIONS -1 ) { 
                 confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, angle: randomRange(80,100), scalar: 1, zIndex: 10000});
            }
        } else {
            if (feedbackTextElement) {
                feedbackTextElement.classList.add('wrong');
                feedbackTextElement.classList.add('feedback-text-shake');
                setTimeout(() => {
                    if (feedbackTextElement) feedbackTextElement.classList.remove('feedback-text-shake');
                }, 400); 
            }
            if (choicesAreaElement) Array.from(choicesAreaElement.getElementsByTagName('button')).find(btn => btn.dataset.answer === userYesNoChoice)?.classList.add('wrong');
        }

        if (choicesAreaElement) { 
            if(isCorrectAttribution) { 
                 Array.from(choicesAreaElement.getElementsByTagName('button')).find(btn => btn.dataset.answer === "yes")?.classList.add('reveal-correct-binary');
            } else { 
                 Array.from(choicesAreaElement.getElementsByTagName('button')).find(btn => btn.dataset.answer === "no")?.classList.add('reveal-correct-binary');
            }
        }
        
        lastActualSpeakerId = actualSpeaker; 

        if (nextQuestionBtn) nextQuestionBtn.style.display = 'inline-flex';
    }

    function applyScoreColoring(currentScore) {
        if (!mainNumberElement) return;
        
        SCORE_TIERS.forEach(tier => mainNumberElement.classList.remove(tier.className));
        mainNumberElement.classList.remove('increased', 'decreased'); 

        let appliedClass = SCORE_TIERS.find(tier => tier.limit === 0)?.className || 'score-tier-0-9'; 
        if (currentScore < 0) {
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


    function updateProgress() {
        const totalQuestionsInSet = currentQuizSet.length;
        if (totalQuestionsInSet > 0) {
            if (progressBarElement) progressBarElement.style.width = `${((currentQuestionIndex) / totalQuestionsInSet) * 100}%`;
            if (progressTextElement) progressTextElement.textContent = `問題 ${currentQuestionIndex + 1} / ${totalQuestionsInSet}`;
        } else {
            if (progressBarElement) progressBarElement.style.width = `0%`;
            if (progressTextElement) progressTextElement.textContent = `問題 - / -`;
        }
    }

    function showResults() {
        if (quizAreaElement) quizAreaElement.style.display = 'none';
        if(attributionQuestionArea) attributionQuestionArea.style.display = 'none';
        if (resultAreaElement) resultAreaElement.style.display = 'block'; 
        
        const resultCard = document.querySelector('.result-card');
        if(resultCard) { 
            resultCard.style.opacity = '0'; 
            resultCard.style.transform = 'translateY(30px) scale(0.95)';
            resultCard.style.animation = 'none'; 
            resultCard.offsetHeight; 
            resultCard.style.animation = ''; 
        }
        
        const totalAnswered = currentQuizSet.length; 
        // if (totalQuestionsOnResultElement) totalQuestionsOnResultElement.textContent = totalAnswered; 
        if (finalScoreValueElementOnResult) finalScoreValueElementOnResult.textContent = score;

        let rank = '', rankTitle = '', message = '', iconClass = ''; 
        // スコアボーナスを除いた純粋な正解数でランク判定
        const baseCorrectAnswers = reduceShirochanRateGlobal ? score - 10 : score; 


        // ★★★ 新しいスコア評価（より厳しく、皮肉を込めて） ★★★
        if (baseCorrectAnswers === 10) { 
            rank = 'godlike'; rankTitle = "全知全能の神 Lv.999"; // 変更
            message = "全問正解…？あなた、この会話の『創造主』ですか？もはや言葉もありません。参りました…（土下座）"; // 変更
            iconClass = 'fas fa-infinity'; // 変更
             if (typeof confetti === 'function') { 
                const end = Date.now() + (5 * 1000); 
                const colors = ['#ffd700', '#ff00ff', '#00ffff', '#ffffff', '#ff4500', '#adff2f']; // 虹色＋金銀
                (function frame() {
                    confetti({ particleCount: 12, angle: randomRange(0, 360), spread: randomRange(80, 180), startVelocity: randomRange(40,70), origin: { x: Math.random(), y: Math.random() - 0.2 }, colors: colors, scalar: Math.random() * 1.2 + 0.8, drift: Math.random() * 0.8 - 0.4, zIndex:10000, shapes: ['star', 'circle', 'square'] });
                    if (Date.now() < end) { requestAnimationFrame(frame); }
                }());
                setTimeout(() => { confetti({ particleCount: 300, spread: 220, origin: { y: 0.4 }, colors: colors, scalar: 1.7, zIndex: 10001, ticks: 500 }); }, 300);
            }
        } else if (baseCorrectAnswers >= 9) {
            rank = 'ss'; rankTitle = "超次元ハッカー";
            message = "9点…！あなたはもはや会話のログを直接脳内にダウンロードでもしてるんですか？その技術、教えてほしい（切実）。";
            iconClass = 'fas fa-network-wired';
        } else if (baseCorrectAnswers >= 8) {
            rank = 's'; rankTitle = "トークルームの監視者";
            message = "8点！素晴らしい！このトークルームの全てはあなたの監視下にあると言っても過言ではないでしょう。お見事！";
            iconClass = 'fas fa-satellite';
        } else if (baseCorrectAnswers >= 7) {
            rank = 'a_plus'; rankTitle = "鋭敏なる読解者";
            message = "7点！なかなかの洞察力。言葉の裏に隠された真実まで見抜いていますね。名探偵の素質アリ！";
            iconClass = 'fas fa-user-ninja';
        } else if (baseCorrectAnswers >= 6) {
            rank = 'a'; rankTitle = "そこそこ聞き上手";
            message = "6割。悪くないです。人の話、ちゃんと聞いてますね。…たまには自分の話もしていいんですよ？";
            iconClass = 'fas fa-comments-dollar'; // ちょっと皮肉
        } else if (baseCorrectAnswers >= 4) { 
            rank = 'b'; rankTitle = "平均的共感性の持ち主";
            message = "4～5点。うん、人間らしいスコアです。安心しました。この世はまだ捨てたもんじゃない。";
            iconClass = 'fas fa-users';
        } else if (baseCorrectAnswers >= 2) { 
            rank = 'c'; rankTitle = "今日の運勢：大凶";
            message = "2～3点。あらら…今日はちょっとツイてなかったみたいですね。大丈夫、明日はきっといい日ですよ！…たぶん。";
            iconClass = 'fas fa-cloud-sun-rain';
        } else { 
            rank = 'd'; rankTitle = "記憶、宇宙の彼方に";
            message = "0～1点！…もしかして、昨日の夕食も覚えてないタイプですか？その潔さ、逆に尊敬します！";
            iconClass = 'fas fa-meteor';
        }
        
        if (rankIconDisplayElement) {
             rankIconDisplayElement.className = `rank-icon-display rank-${rank}`; 
             rankIconDisplayElement.innerHTML = `<i class="${iconClass}"></i>`;
        }
        if (rankTitleDisplayElement) rankTitleDisplayElement.textContent = rankTitle;
        if (rankMessageDisplayElement) rankMessageDisplayElement.textContent = message;
        // finalScoreValueElementOnResult はモーダル内の要素、currentScoreValueElement はヘッダーの要素
        if (finalScoreValueElementOnResult) animateValue(finalScoreValueElementOnResult, 0, score, 700 + Math.abs(score) * 30); 
        
        if (progressBarElement) progressBarElement.style.width = '100%';
        if (progressTextElement) progressTextElement.textContent = `全 ${totalAnswered} 問完了！`;
    }
    
    function animateValue(element, start, end, duration) {
        if (!element) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            element.textContent = Math.floor(progress * (end - start) + start);
            if (progress < 1) { window.requestAnimationFrame(step); }
        };
        window.requestAnimationFrame(step);
    }

    function shuffleArray(array) { 
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    function randomRange(min, max) { return Math.random() * (max - min) + min; }
    
    const currentYearElement = document.getElementById('current-year');
    if (currentYearElement) currentYearElement.textContent = new Date().getFullYear();

    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', () => {
            currentQuestionIndex++;
            if (currentQuestionIndex < currentQuizSet.length) {
                displayQuestion();
                updateProgress(); 
            } else {
                if(progressBarElement) progressBarElement.style.width = '100%'; 
                if(progressTextElement) progressTextElement.textContent = `結果を計算中...`; 
                showResults();
            }
        });
    }
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (gameOverModal) {
                 gameOverModal.style.opacity = '0';
                 setTimeout(() => { if(gameOverModal) gameOverModal.style.display = 'none';}, 300);
            }
            if (preGameOptionsScreen && appContainer) { 
                preGameOptionsScreen.classList.remove('hidden');
                preGameOptionsScreen.style.display = 'flex';
                appContainer.style.display = 'none';
            } else { 
                // If preGameOptionsScreen doesn't exist, directly start game
                // This path shouldn't be taken if HTML is correct.
                // For safety, ensure data is prepared if it wasn't.
                if (allQuizData.length === 0) { 
                    loadDataAndStartGame(); // Try to load data if not already available
                } else {
                    prepareNewQuizSet(); 
                    startGame();
                }
            }
        });
    }
    
    if (affinityCheckButton && affinityModal && closeAffinityModalButton) {
        affinityCheckButton.addEventListener('click', () => {
            // buildAffinityTable(); // buildAffinityTable function would need to be defined for card game
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
    
    initializeQuizApp();
});
