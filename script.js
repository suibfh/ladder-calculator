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
            // 名前入力欄を削除し、レートと勝率を横並びに
            opponentDiv.innerHTML = `
                <h3>対戦相手 ${i + 1}</h3>
                <div class="input-row">
                    <div class="input-item">
                        <label for="gainRate${i}">獲得レート:</label>
                        <input type="number" id="gainRate${i}" min="0" required>
                    </div>
                    <div class="input-item">
                        <label for="loseRate${i}">喪失レート:</label>
                        <input type="number" id="loseRate${i}" min="0" required>
                    </div>
                    <div class="input-item">
                        <label for="winRate${i}">勝率 (%):</label>
                        <input type="number" id="winRate${i}" min="0" max="100" required>
                    </div>
                </div>
            `;
            opponentsContainer.appendChild(opponentDiv);
        }
    }

    // シミュレーション実行ボタンのイベントリスナー
    simulateButton.addEventListener('click', () => {
        simulateButton.disabled = true; // ボタンを無効化して多重クリック防止
        simulationResultDiv.innerHTML = '<p>シミュレーション中...</p>'; // 結果表示エリアをクリア

        const opponentCount = parseInt(opponentCountSelect.value, 10);
        const totalBattles = parseInt(totalBattlesInput.value, 10);

        // 総戦闘回数のバリデーション
        if (isNaN(totalBattles) || totalBattles <= 0) {
            simulationResultDiv.innerHTML = '<p style="color: red;"><strong>総戦闘回数</strong>を入力してください（1以上の数値）。</p>';
            simulateButton.disabled = false;
            return;
        }

        const opponents = [];
        let missingInputs = []; // 未入力項目を記録する配列

        for (let i = 0; i < opponentCount; i++) {
            const gainRateInput = document.getElementById(`gainRate${i}`);
            const loseRateInput = document.getElementById(`loseRate${i}`);
            const winRateInput = document.getElementById(`winRate${i}`);

            const gainRate = parseInt(gainRateInput.value, 10);
            const loseRate = parseInt(loseRateInput.value, 10);
            const winRate = parseInt(winRateInput.value, 10);

            // 未入力チェックと数値バリデーション
            if (gainRateInput.value === '' || isNaN(gainRate) || gainRate < 0) {
                missingInputs.push(`対戦相手${i + 1}の「獲得レート」`);
            }
            if (loseRateInput.value === '' || isNaN(loseRate) || loseRate < 0) {
                missingInputs.push(`対戦相手${i + 1}の「喪失レート」`);
            }
            if (winRateInput.value === '' || isNaN(winRate) || winRate < 0 || winRate > 100) {
                missingInputs.push(`対戦相手${i + 1}の「勝率」`);
            }

            opponents.push({
                gainRate: gainRate,
                loseRate: loseRate,
                winRate: winRate
            });
        }

        // 未入力項目がある場合のエラー表示
        if (missingInputs.length > 0) {
            simulationResultDiv.innerHTML = `<p style="color: red;">以下の項目を入力してください:<br>・${missingInputs.join('<br>・')}</p>`;
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
        let trendText = '';
        let rateDisplay = '';
        let textColor = '';

        if (currentRate > 0) {
            trendText = '上がる';
            rateDisplay = `+${currentRate}ポイント`;
            textColor = 'green';
        } else if (currentRate < 0) {
            trendText = '下がる';
            rateDisplay = `${currentRate}ポイント`;
            textColor = 'red';
        } else { // currentRate === 0
            trendText = '変わらない';
            rateDisplay = `±0ポイント`;
            textColor = '#555'; // グレー系の色
        }

        resultText = `<p><strong>${totalBattles}回</strong>の戦闘をシミュレートした結果、レートは <span style="color: ${textColor};"><strong>${rateDisplay}</strong></span> 増加する期待値です。このまま戦い続ければ、レートは【${trendText}】傾向にあります。</p>`;
        
        simulationResultDiv.innerHTML = resultText;
        simulateButton.disabled = false; // ボタンを再度有効化
    });
});