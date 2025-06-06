document.addEventListener('DOMContentLoaded', () => {
    const opponentCountSelect = document.getElementById('opponentCount');
    const opponentsContainer = document.getElementById('opponentsContainer');
    const totalBattlesInput = document.getElementById('totalBattles');
    const simulateButton = document.getElementById('simulateButton');
    const simulationResultDiv = document.getElementById('simulationResult');

    // 対戦相手人数の選択肢を生成
    for (let i = 5; i <= 60; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i}人`;
        opponentCountSelect.appendChild(option);
    }

    // 初期表示として5人分の入力フォームを生成
    generateOpponentInputs(5);

    // 対戦相手人数の選択が変更されたらフォームを再生成
    opponentCountSelect.addEventListener('change', () => {
        const count = parseInt(opponentCountSelect.value, 10);
        generateOpponentInputs(count);
    });

    // 対戦相手の入力フォームを生成する関数
    function generateOpponentInputs(count) {
        opponentsContainer.innerHTML = ''; // 既存のフォームをクリア
        for (let i = 0; i < count; i++) {
            const opponentDiv = document.createElement('div');
            opponentDiv.className = 'opponent-input';
            opponentDiv.innerHTML = `
                <h3>対戦相手 ${i + 1}</h3>
                <div class="form-group">
                    <label for="opponentName${i}">名前 (任意):</label>
                    <input type="text" id="opponentName${i}" value="対戦相手${i + 1}" placeholder="対戦相手${i + 1}">
                </div>
                <div class="form-group">
                    <label for="gainRate${i}">勝った時の獲得レート:</label>
                    <input type="number" id="gainRate${i}" value="10" min="0" required>
                </div>
                <div class="form-group">
                    <label for="loseRate${i}">負けた時の喪失レート:</label>
                    <input type="number" id="loseRate${i}" value="10" min="0" required>
                </div>
                <div class="form-group">
                    <label for="winRate${i}">勝率 (%) (0〜100):</label>
                    <input type="number" id="winRate${i}" value="50" min="0" max="100" required>
                </div>
            `;
            opponentsContainer.appendChild(opponentDiv);
        }
    }

    // シミュレーション実行ボタンのイベントリスナー
    simulateButton.addEventListener('click', () => {
        simulateButton.disabled = true; // ボタンを無効化して多重クリック防止
        simulationResultDiv.innerHTML = '<p>シミュレーション中...</p>';

        const opponentCount = parseInt(opponentCountSelect.value, 10);
        const totalBattles = parseInt(totalBattlesInput.value, 10);

        if (totalBattles <= 0 || isNaN(totalBattles)) {
            simulationResultDiv.innerHTML = '<p style="color: red;">総戦闘回数は1以上の数値を入力してください。</p>';
            simulateButton.disabled = false;
            return;
        }

        const opponents = [];
        let isValid = true;
        for (let i = 0; i < opponentCount; i++) {
            const nameInput = document.getElementById(`opponentName${i}`);
            const gainRateInput = document.getElementById(`gainRate${i}`);
            const loseRateInput = document.getElementById(`loseRate${i}`);
            const winRateInput = document.getElementById(`winRate${i}`);

            const gainRate = parseInt(gainRateInput.value, 10);
            const loseRate = parseInt(loseRateInput.value, 10);
            const winRate = parseInt(winRateInput.value, 10);

            // 入力値のバリデーション
            if (isNaN(gainRate) || gainRate < 0 ||
                isNaN(loseRate) || loseRate < 0 ||
                isNaN(winRate) || winRate < 0 || winRate > 100) {
                isValid = false;
                break;
            }

            opponents.push({
                name: nameInput.value || `対戦相手${i + 1}`,
                gainRate: gainRate,
                loseRate: loseRate,
                winRate: winRate
            });
        }

        if (!isValid) {
            simulationResultDiv.innerHTML = '<p style="color: red;">対戦相手の入力値に不正があります。数値は0以上、勝率は0〜100で入力してください。</p>';
            simulateButton.disabled = false;
            return;
        }

        let currentRate = 0; // シミュレーション開始レートは0と仮定

        // シミュレーションロジック
        for (let i = 0; i < totalBattles; i++) {
            const randomIndex = Math.floor(Math.random() * opponents.length);
            const chosenOpponent = opponents[randomIndex];

            const winChance = chosenOpponent.winRate / 100;
            const didWin = Math.random() < winChance; // ランダムな数値が勝率より小さければ勝利

            if (didWin) {
                currentRate += chosenOpponent.gainRate;
            } else {
                currentRate -= chosenOpponent.loseRate;
            }
        }

        // 結果表示
        let resultText = '';
        let trend = currentRate >= 0 ? '上がる' : '下がる';
        let rateDisplay = currentRate >= 0 ? `+${currentRate}ポイント` : `${currentRate}ポイント`;
        let textColor = currentRate >= 0 ? 'green' : 'red';

        resultText = `<p><strong>${totalBattles}回</strong>の戦闘をシミュレートした結果、レートは <span style="color: ${textColor};"><strong>${rateDisplay}</strong></span> 増加する期待値です。このまま戦い続ければ、レートは【${trend}】傾向にあります。</p>`;
        
        simulationResultDiv.innerHTML = resultText;
        simulateButton.disabled = false; // ボタンを再度有効化
    });
});