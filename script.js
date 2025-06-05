document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const winsInput = document.getElementById('wins');
    const lossesInput = document.getElementById('losses');
    const currentRateInput = document.getElementById('currentRate');
    const targetRateIncreaseInput = document.getElementById('targetRateIncrease');
    const totalPlayersInput = document.getElementById('totalPlayers');

    const tierRateBoundariesDiv = document.getElementById('tierRateBoundaries'); // Tier境界レート入力用div

    const winRateVsMuchHigherInput = document.getElementById('winRateVsMuchHigher');
    const winRateVsSlightlyHigherInput = document.getElementById('winRateVsSlightlyHigher');
    const winRateVsEqualInput = document.getElementById('winRateVsEqual');
    const winRateVsSlightlyLowerInput = document.getElementById('winRateVsSlightlyLower');
    const winRateVsMuchLowerInput = document.getElementById('winRateVsMuchLower');

    const calculateButton = document.getElementById('calculateButton');

    // --- 出力表示要素 ---
    const totalMatchesDisplay = document.getElementById('totalMatchesDisplay');
    const currentWinRateDisplay = document.getElementById('currentWinRate');
    const expectedRate100MatchesDisplay = document.getElementById('expectedRate100Matches');
    const neededWinsForTargetDisplay = document.getElementById('neededWinsForTarget');

    // 詳細レート変動量テーブル要素
    const gainMuchHigherCalculated = document.getElementById('gainMuchHigherCalculated');
    const lossMuchHigherCalculated = document.getElementById('lossMuchHigherCalculated');
    const gainSlightlyHigherCalculated = document.getElementById('gainSlightlyHigherCalculated');
    const lossSlightlyHigherCalculated = document.getElementById('lossSlightlyHigherCalculated');
    const gainEqualCalculated = document.getElementById('gainEqualCalculated');
    const lossEqualCalculated = document.getElementById('lossEqualCalculated');
    const gainSlightlyLowerCalculated = document.getElementById('gainSlightlyLowerCalculated');
    const lossSlightallyLowerCalculated = document.getElementById('lossSlightlyLowerCalculated');
    const gainMuchLowerCalculated = document.getElementById('gainMuchLowerCalculated');
    const lossMuchLowerCalculated = document.getElementById('lossMuchLowerCalculated');

    // Tierレート推定テーブル要素
    const tierRateTableBody = document.querySelector('#tierRateTable tbody');


    // --- 定数と初期データ ---
    const rateDiffCoefficient = 0.04; // 公式ヘルプより固定値
    const initialTierRates = { // デバッグ・テスト用。最終的にはユーザー入力
        'フロンティア マスター': 2000,
        'フロンティア ダイヤモンド': 1800,
        'フロンティア プラチナ': 1600,
        'ゴールド 1': 1400,
        'ゴールド 2': 1350,
        'ゴールド 3': 1300,
        'シルバー 1': 1250,
        'シルバー 2': 1200,
        'シルバー 3': 1150,
        'ブロンズ 1': 1100,
        'ブロンズ 2': 1050,
        'ブロンズ 3': 1000
    };

    // 公式情報に基づいたTierデータと割合（percentage）
    const TIER_DATA = [
        { name: 'フロンティア マスター', percentage: 0.01 },
        { name: 'フロンティア ダイヤモンド', percentage: 0.04 },
        { name: 'フロンティア プラチナ', percentage: 0.05 },
        { name: 'ゴールド 1', percentage: 0.0667 },
        { name: 'ゴールド 2', percentage: 0.0667 },
        { name: 'ゴールド 3', percentage: 0.0667 },
        { name: 'シルバー 1', percentage: 0.10 },
        { name: 'シルバー 2', percentage: 0.10 },
        { name: 'シルバー 3', percentage: 0.10 },
        { name: 'ブロンズ 1', percentage: 0.1330 }, // 修正: 13.36% -> 13.30%
        { name: 'ブロンズ 2', percentage: 0.1330 },
        { name: 'ブロンズ 3', percentage: 0.1330 }
    ];

    // Tier境界レートの入力フィールドを動的に生成
    function generateTierRateInputs() {
        let htmlContent = '';
        TIER_DATA.forEach(tier => {
            // ブロンズ3は最低レートなので入力不要
            if (tier.name === 'ブロンズ 3') {
                return;
            }
            htmlContent += `
                <div class="input-group">
                    <label for="rate-${tier.name.replace(/\s/g, '-')}-min">${tier.name} 最低レート:</label>
                    <input type="number" id="rate-${tier.name.replace(/\s/g, '-')}-min" 
                           value="${initialTierRates[tier.name] || ''}" placeholder="例: ${initialTierRates[tier.name] || '1000'}" min="0">
                </div>
            `;
        });
        tierRateBoundariesDiv.innerHTML += htmlContent; // 既存のpタグの後に追記
    }
    generateTierRateInputs();


    // --- 関数定義 ---

    /**
     * 現在のレートと順位から、ランダムな対戦相手のレートを推定する関数。
     * マッチング仕様「上下30人」を考慮。
     * @param {number} currentRate 現在のレート
     * @param {number} currentRank 現在の順位
     * @param {number} totalPlayers ランクマッチの参加人数
     * @param {object} tierRates 各Tierの最低レート
     * @returns {number} 推定された対戦相手のレート
     */
    function getOpponentRate(currentRate, currentRank, totalPlayers, tierRates) {
        // マッチング仕様に基づき、現在の順位から上下30人の範囲でランダムなオフセットを生成
        // ただし、順位は1位からtotalPlayersまで
        const minRankOffset = Math.max(1 - currentRank, -30);
        const maxRankOffset = Math.min(totalPlayers - currentRank, 30);
        const randomOffset = Math.floor(Math.random() * (maxRankOffset - minRankOffset + 1)) + minRankOffset;
        const opponentRank = currentRank + randomOffset;

        // 対戦相手の順位からレートを推定（逆引き）
        // 現時点ではrank -> rateの正確なマッピングがないため、Tier Ratesと現在のレートから概算
        // 最もシンプルな方法として、Tier境界レート情報と現在のレートを基に相手レートを決定
        // ここはシミュレーション精度に大きく影響するため、要調整ポイント
        
        // 簡易的な相手レート推定ロジック
        // 現在のレートから±(自身のレートの10%または最低100)の範囲でランダムなレートを選択
        // 実際のゲームでは、順位が近いほどレートも近い傾向にあるが、厳密な計算は複雑
        const rateRange = Math.max(100, currentRate * 0.1); // レート差の許容範囲
        let adjustedOpponentRate = currentRate + (Math.random() * rateRange * 2) - rateRange;
        
        // 相手レートがTier境界レートから大きく外れないように調整
        // TODO: Tier境界レートと順位の関係からより正確なレートを導出するロジックを検討
        // ここではあくまで、現在のレートから一定範囲内の相手とマッチングするという簡易的な処理
        // より正確なシミュレーションには、Rank -> Rateの関数やデータが必要
        
        return Math.max(0, adjustedOpponentRate); // レートは0以下にならない
    }


    /**
     * 計算結果を元にTierと推定レート帯の目安を表示する
     * @param {number} totalPlayers ランクマッチの参加人数
     * @param {object} tierRates 各Tierの最低レート
     */
    function displayTierEstimates(totalPlayers, tierRates) {
        let htmlContent = '';
        let cumulativePercentage = 0;

        // Tierデータを逆順にして、ブロンズ3からフロンティアマスターまで表示
        // これにより、低いレートから高いレートへのTier境界が明確になる
        // ただし、TIER_DATAは上位から定義されているため、そのまま使用し、rankLimitを逆順で算出
        
        const sortedTierData = [...TIER_DATA].sort((a, b) => {
            // Tierの順序に基づいてソート（フロンティアマスターが一番上）
            const tierOrder = {
                'フロンティア マスター': 1,
                'フロンティア ダイヤモンド': 2,
                'フロンティア プラチナ': 3,
                'ゴールド 1': 4, 'ゴールド 2': 5, 'ゴールド 3': 6,
                'シルバー 1': 7, 'シルバー 2': 8, 'シルバー 3': 9,
                'ブロンズ 1': 10, 'ブロンズ 2': 11, 'ブロンズ 3': 12
            };
            return tierOrder[a.name] - tierOrder[b.name];
        });

        tierRateTableBody.innerHTML = ''; // テーブル内容をクリア

        sortedTierData.forEach(tier => {
            cumulativePercentage += tier.percentage;
            // 順位範囲の計算: 上位から累積パーセンテージで算出
            // 例: フロンティアマスター (1%) -> 1位から (総人数 * 0.01)位まで
            // ゴールド1 (6.67%) -> 総人数 * (1% + 4% + 5% + 6.67%) 位まで
            
            // Tierの境界を考慮した順位の算出（例: cumulativePercentage - currentTierPercentage + 1位 から cumulativePercentage 位まで）
            const rankStart = Math.ceil(totalPlayers * (cumulativePercentage - tier.percentage));
            const rankEnd = Math.ceil(totalPlayers * cumulativePercentage);

            // Tier境界レートの取得
            const minRate = tierRates[tier.name];
            let rateRangeDisplay;

            if (tier.name === 'フロンティア マスター') {
                // マスターは上限がないため
                rateRangeDisplay = `${minRate} 〜`;
            } else if (tier.name === 'ブロンズ 3') {
                // ブロンズ3は最低レートからの始まり
                rateRangeDisplay = `〜 ${minRate}`; // これは初期値のブロンズ3の値が使われる前提
            } else {
                // その他のTierは "下のTierの最低レート ~ 自分のTierの最低レート"
                // TIER_DATAは上位から並んでいるため、次の（低い）Tierのレートを取得
                const nextLowerTier = sortedTierData[sortedTierData.indexOf(tier) + 1];
                if (nextLowerTier) {
                    rateRangeDisplay = `${tierRates[nextLowerTier.name]} 〜 ${minRate}`;
                } else {
                    rateRangeDisplay = `〜 ${minRate}`; // 最下位Tierの場合のフォールバック
                }
            }

            const row = tierRateTableBody.insertRow();
            const rankCell = row.insertCell();
            const rateCell = row.insertCell();

            // ここで順位範囲と推定レート帯の表示順を修正
            rankCell.textContent = `${rankStart + 1} 位 〜 ${rankEnd} 位`; // 順位は1から始まるため +1
            rateCell.textContent = rateRangeDisplay;
        });
    }


    // --- メイン計算ロジック ---
    calculateButton.addEventListener('click', () => {
        // --- 1. 入力値の取得とバリデーション ---
        const wins = parseInt(winsInput.value);
        const losses = parseInt(lossesInput.value);
        let currentRate = parseInt(currentRateInput.value);
        const targetRateIncrease = parseInt(targetRateIncreaseInput.value);
        const totalPlayers = parseInt(totalPlayersInput.value);

        // Tier境界レートの取得とバリデーション
        const tierRates = {};
        let allTierRatesProvided = true;
        TIER_DATA.forEach(tier => {
            // ブロンズ3は最低レートとして固定値を利用（ユーザー入力不要）
            if (tier.name === 'ブロンズ 3') {
                tierRates[tier.name] = initialTierRates['ブロンズ 3']; // 初期値を活用
                return;
            }
            const inputId = `rate-${tier.name.replace(/\s/g, '-')}-min`;
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                const rate = parseInt(inputElement.value);
                if (isNaN(rate) || rate < 0) {
                    allTierRatesProvided = false;
                    // エラーメッセージの表示をここに実装（後日詳細調整）
                    alert(`「${tier.name} 最低レート」に有効な数値を入力してください。`);
                    return; // ループを中断
                }
                tierRates[tier.name] = rate;
            } else {
                allTierRatesProvided = false;
                alert(`Tierレート入力フィールドが見つかりません: ${inputId}`); // デバッグ用
                return;
            }
        });

        if (!allTierRatesProvided) {
            return; // 処理を中断
        }
        
        // 入力値の基本バリデーション
        if (isNaN(wins) || isNaN(losses) || isNaN(currentRate) || isNaN(targetRateIncrease) || isNaN(totalPlayers) ||
            wins < 0 || losses < 0 || currentRate < 0 || targetRateIncrease < 0 || totalPlayers < 1) {
            alert('全ての入力項目に有効な数値を入力してください。');
            return;
        }

        // Tier境界レートの論理的な順序チェック（例: ゴールド1 < プラチナ）
        // TIER_DATAは上位から下位の順に並んでいるので、逆順にチェック
        let ratesAreOrdered = true;
        for (let i = 0; i < TIER_DATA.length - 1; i++) {
            const currentTierName = TIER_DATA[i].name;
            const nextTierName = TIER_DATA[i+1].name;

            // 最下位Tierのチェックは不要なのでスキップ
            if (currentTierName === 'ブロンズ 3' || nextTierName === 'ブロンズ 3') continue;

            if (tierRates[currentTierName] <= tierRates[nextTierName]) {
                alert(`${currentTierName} の最低レートは ${nextTierName} の最低レートより高く設定してください。`);
                ratesAreOrdered = false;
                break;
            }
        }
        if (!ratesAreOrdered) return;


        const winRateVsMuchHigher = parseFloat(winRateVsMuchHigherInput.value) / 100;
        const winRateVsSlightlyHigher = parseFloat(winRateVsSlightlyHigherInput.value) / 100;
        const winRateVsEqual = parseFloat(winRateVsEqualInput.value) / 100;
        const winRateVsSlightlyLower = parseFloat(winRateVsSlightlyLowerInput.value) / 100;
        const winRateVsMuchLower = parseFloat(winRateVsMuchLowerInput.value) / 100;

        if (isNaN(winRateVsMuchHigher) || isNaN(winRateVsSlightlyHigher) || isNaN(winRateVsEqual) ||
            isNaN(winRateVsSlightlyLower) || isNaN(winRateVsMuchLower) ||
            winRateVsMuchHigher < 0 || winRateVsMuchHigher > 1 ||
            winRateVsSlightlyHigher < 0 || winRateVsSlightlyHigher > 1 ||
            winRateVsEqual < 0 || winRateVsEqual > 1 ||
            winRateVsSlightlyLower < 0 || winRateVsSlightlyLower > 1 ||
            winRateVsMuchLower < 0 || winRateVsMuchLower > 1) {
            alert('勝率は0%から100%の間で入力してください。');
            return;
        }

        // --- 2. 各種計算 ---

        const totalMatches = wins + losses;
        const currentWinRate = totalMatches === 0 ? 0 : (wins / totalMatches) * 100;

        // 現在の順位を推定（Tier境界レートから逆算）
        // 厳密な順位計算は複雑なため、Tier境界レートと現在のレートから最も近いTierの順位として概算
        let currentRank = totalPlayers; // 最下位と仮定
        for (let i = 0; i < TIER_DATA.length; i++) {
            const tierName = TIER_DATA[i].name;
            const tierMinRate = tierRates[tierName];
            if (currentRate >= tierMinRate) {
                // このTierに属すると仮定し、Tierの割合から順位を概算
                // ここは非常に簡易的なので、より厳密な順位推定ロジックが必要であれば要検討
                // 最上位Tierから順に見ていき、該当するTierが見つかったらそのTierの真ん中あたりの順位とする
                let cumulativePercentageBelow = 0;
                for(let j = i + 1; j < TIER_DATA.length; j++) {
                    cumulativePercentageBelow += TIER_DATA[j].percentage;
                }
                currentRank = Math.round(totalPlayers * (1 - cumulativePercentageBelow - (TIER_DATA[i].percentage / 2)));
                currentRank = Math.max(1, Math.min(totalPlayers, currentRank)); // 1位から総人数以内
                break;
            } else if (i === TIER_DATA.length - 1) { // 最下位Tierよりもレートが低い場合
                 currentRank = totalPlayers;
            }
        }
        currentRank = Math.max(1, Math.min(totalPlayers, currentRank)); // 順位は1以上totalPlayers以下

        // シミュレーション実行
        let simulatedRate = currentRate;
        let simulatedWins = wins;
        let simulatedLosses = losses;
        let rateChangesSum = 0;

        const simulationMatches = 100; // 100戦後の期待値計算用

        for (let i = 0; i < simulationMatches; i++) {
            const opponentRate = getOpponentRate(simulatedRate, currentRank, totalPlayers, tierRates);
            let rateChange = 0;

            // 相手レートとの差を基に勝率を決定
            const rateDifference = simulatedRate - opponentRate;
            let winProbability;

            if (rateDifference > 200) { // かなり低い
                winProbability = winRateVsMuchLower;
            } else if (rateDifference > 50) { // やや低い
                winProbability = winRateVsSlightlyLower;
            } else if (rateDifference >= -50) { // 同等
                winProbability = winRateVsEqual;
            } else if (rateDifference >= -200) { // やや高い
                winProbability = winRateVsSlightlyHigher;
            } else { // かなり高い
                winProbability = winRateVsMuchHigher;
            }

            if (Math.random() < winProbability) { // 勝利
                rateChange = 16 + (opponentRate - simulatedRate) * rateDiffCoefficient;
                if (rateChange < 1) rateChange = 1; // 最低獲得ポイント
                simulatedWins++;
            } else { // 敗北
                // 敗北時の計算式修正: (ランクマッチ全体の勝利数/ランクマッチ全体の敗北数) を 1.0 と仮定
                // 理由: この係数はプレイヤーが確認できない全体データであり、シミュレーションの精度を保ちつつ、
                // 最もシンプルな仮定として、長期的には勝利数と敗北数が概ね等しくなると想定し、1.0を用いる。
                rateChange = (16 + (simulatedRate - opponentRate) * rateDiffCoefficient) * (-1.0) * 1.0; 
                if (rateChange > -1) rateChange = -1; // 最低喪失ポイント
                simulatedLosses++;
            }
            simulatedRate += rateChange;
            rateChangesSum += rateChange;
        }

        const expectedRate100Matches = currentRate + (rateChangesSum / simulationMatches) * 100;

        // 目標レート達成までの必要勝利数計算
        const targetRate = currentRate + targetRateIncrease;
        let neededWins = 0;
        let tempRate = currentRate;
        
        // 簡易的な計算：平均的なレート変動を仮定
        // 各相手レート差の平均勝率、平均敗率から期待変動値を計算
        const averageWinProb = (winRateVsMuchHigher + winRateVsSlightlyHigher + winRateVsEqual + winRateVsSlightlyLower + winRateVsMuchLower) / 5;
        
        // 平均的な勝利と敗北のレート変動（同等レートの相手との対戦を仮定）
        const averageWinGain = 16 + (0) * rateDiffCoefficient; // 同等相手との勝利
        const averageLossLoss = (16 + (0) * rateDiffCoefficient) * (-1.0) * 1.0; // 同等相手との敗北

        if (averageWinGain <= 0) { // レートが上がらない場合は計算不可
             neededWinsForTargetDisplay.textContent = '計算不能（レートが上がらない）';
        } else {
            // 各試合での期待レート変動を計算
            let expectedRateChangePerMatch = (averageWinProb * averageWinGain) + ((1 - averageWinProb) * averageLossLoss);
            
            if (expectedRateChangePerMatch <= 0) {
                neededWinsForTargetDisplay.textContent = '計算不能（目標達成が困難）';
            } else {
                // 目標レートに達するまでに必要な試合数
                const matchesToTarget = targetRateIncrease / expectedRateChangePerMatch;
                neededWins = Math.ceil(matchesToTarget * averageWinProb); // 必要な勝利数のみ概算
                if (neededWins < 0) neededWins = 0; // マイナスにはならない
                neededWinsForTargetDisplay.textContent = neededWins;
            }
        }


        // --- 詳細なレート変動量 (1勝または1敗あたり) ---
        const detailedRateChanges = {};
        const rateDifferences = {
            muchHigher: -250, // 相手が自分よりかなり高いレート（例: -250）
            slightlyHigher: -100, // やや高い（例: -100）
            equal: 0, // 同等（例: 0）
            slightlyLower: 100, // やや低い（例: 100）
            muchLower: 250 // かなり低い（例: 250）
        };

        for (const category in rateDifferences) {
            const adjustedOpponentRate = currentRate - rateDifferences[category]; // 相手レート = 自分レート - 差分
            
            let gain = 16 + (adjustedOpponentRate - currentRate) * rateDiffCoefficient;
            if (gain < 1) gain = 1;
            
            // 敗北時の計算式にも1.0の係数を適用
            let loss = (16 + (currentRate - adjustedOpponentRate) * rateDiffCoefficient) * (-1.0) * 1.0; 
            if (loss > -1) loss = -1;
            
            detailedRateChanges[category] = { gain: gain.toFixed(1), loss: loss.toFixed(1) };
        }

        gainMuchHigherCalculated.textContent = `+${detailedRateChanges.muchHigher.gain}`;
        lossMuchHigherCalculated.textContent = `${detailedRateChanges.muchHigher.loss}`;
        gainSlightlyHigherCalculated.textContent = `+${detailedRateChanges.slightlyHigher.gain}`;
        lossSlightlyHigherCalculated.textContent = `${detailedRateChanges.slightlyHigher.loss}`;
        gainEqualCalculated.textContent = `+${detailedRateChanges.equal.gain}`;
        lossEqualCalculated.textContent = `${detailedRateChanges.equal.loss}`;
        gainSlightlyLowerCalculated.textContent = `+${detailedRateChanges.slightlyLower.gain}`;
        lossSlightallyLowerCalculated.textContent = `${detailedRateChanges.slightlyLower.loss}`;
        gainMuchLowerCalculated.textContent = `+${detailedRateChanges.muchLower.gain}`;
        lossMuchLowerCalculated.textContent = `${detailedRateChanges.muchLower.loss}`;


        // --- 4. 結果の表示 ---
        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        // neededWinsForTargetDisplay は上記で設定済み

        // Tierと推定レート帯の目安の表示を更新
        displayTierEstimates(totalPlayers, tierRates);
    });
});