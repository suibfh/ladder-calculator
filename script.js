document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const winsInput = document.getElementById('wins');
    const lossesInput = document.getElementById('losses');
    const currentRateInput = document.getElementById('currentRate');
    const targetRateIncreaseInput = document.getElementById('targetRateIncrease');
    const totalPlayersInput = document.getElementById('totalPlayers'); // 新しい入力欄

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
    const lossSlightlyLowerCalculated = document.getElementById('lossSlightlyLowerCalculated');
    const gainMuchLowerCalculated = document.getElementById('gainMuchLowerCalculated');
    const lossMuchLowerCalculated = document.getElementById('lossMuchLowerCalculated');

    const tierRateEstimatesDiv = document.getElementById('tierRateEstimates'); // Tierとレートの目安表示用

    // --- ゲームのTier割合データ (固定値) ---
    // 提供された割合に基づいて、上位から順に定義
    // Tierごとの割合は合計100%になるように調整 (小数点以下で誤差が出る場合があるため、最後のTierで調整)
    const TIER_DISTRIBUTION = [
        { name: 'フロンティア マスター', percentage: 1 },
        { name: 'フロンティア ダイヤモンド', percentage: 4 },
        { name: 'フロンティア プラチナ', percentage: 5 },
        { name: 'ゴールド 1', percentage: 6.67 },
        { name: 'ゴールド 2', percentage: 6.67 },
        { name: 'ゴールド 3', percentage: 6.67 },
        { name: 'シルバー 1', percentage: 10 },
        { name: 'シルバー 2', percentage: 10 },
        { name: 'シルバー 3', percentage: 10 },
        { name: 'ブロンズ 1', percentage: 13.30 },
        { name: 'ブロンズ 2', percentage: 13.30 },
        { name: 'ブロンズ 3', percentage: 13.32 } // 合計100%になるように調整
    ];

    // --- 計算実行関数 ---
    calculateButton.addEventListener('click', () => {
        // --- 1. 入力値の取得とバリデーション ---
        const wins = parseInt(winsInput.value) || 0;
        const losses = parseInt(lossesInput.value) || 0;
        const currentRate = parseFloat(currentRateInput.value);
        const targetRateIncrease = parseFloat(targetRateIncreaseInput.value) || 0;
        const totalPlayers = parseInt(totalPlayersInput.value);

        const winRates = {
            'muchHigher': parseFloat(winRateVsMuchHigherInput.value),
            'slightlyHigher': parseFloat(winRateVsSlightlyHigherInput.value),
            'equal': parseFloat(winRateVsEqualInput.value),
            'slightlyLower': parseFloat(winRateVsSlightlyLowerInput.value),
            'muchLower': parseFloat(winRateVsMuchLowerInput.value)
        };

        // 必須入力項目のチェック
        if (isNaN(currentRate) || currentRate < 0) {
            alert('現在のレートを正しく入力してください。');
            currentRateInput.focus();
            return;
        }
        if (isNaN(totalPlayers) || totalPlayers <= 0) {
            alert('ランクマッチの参加人数を正しく入力してください。');
            totalPlayersInput.focus();
            return;
        }
        for (const key in winRates) {
            if (isNaN(winRates[key]) || winRates[key] < 0 || winRates[key] > 100) {
                alert('対戦相手レート別の勝利割合をすべて0～100の範囲で入力してください。');
                return;
            }
        }
        if (wins + losses === 0) {
            alert('勝ち数か負け数のどちらか、または両方を入力してください。');
            winsInput.focus();
            return;
        }

        // --- 2. 各種計算処理 ---

        // 総試合数と現在の勝率
        const totalMatches = wins + losses;
        const currentWinRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

        // Tierと推定レート帯の目安の算出
        let currentRankCumulativePercentage = 0;
        const tierRateEstimates = [];
        let lowestRate = 0; // 最下位のレートを0と仮定

        // Tierの順位範囲を計算
        // 例: 総人数10000人の場合
        // マスター: 1% -> 100人 (1位～100位)
        // ダイヤモンド: 4% -> 400人 (101位～500位)
        // ... のように、Tierごとの順位範囲を割り出す
        const tierRankRanges = [];
        let currentTopRank = 1;
        for (const tier of TIER_DISTRIBUTION) {
            const numPlayersInTier = Math.ceil(totalPlayers * (tier.percentage / 100));
            const bottomRank = currentTopRank + numPlayersInTier - 1;
            tierRankRanges.push({
                name: tier.name,
                topRank: currentTopRank,
                bottomRank: Math.min(bottomRank, totalPlayers) // 最下位ランクを超えないように調整
            });
            currentTopRank = bottomRank + 1;
        }

        // Tierとレートの目安をテーブルとして表示
        let tierEstimateHtml = `<p>（推定レートは、レートが均等に分布すると仮定した場合の目安です）</p><table><thead><tr><th>Tier</th><th>順位範囲</th><th>推定レート帯</th></tr></thead><tbody>`;
        // レートの最大値を仮定 (ゲームによって異なるが、ここでは一般的な2500を上限とする)
        const MAX_RATE = 2500;
        const MIN_RATE = 0;
        const rateRange = MAX_RATE - MIN_RATE;

        // 各Tierの推定レート帯を計算 (簡易的に線形分布を仮定)
        // 例: マスター(トップ1%)なら、レートの99%～100%に位置すると仮定
        for (const tier of TIER_DISTRIBUTION) {
            currentRankCumulativePercentage += tier.percentage;
            const estimatedRateLowerBound = MAX_RATE - (rateRange * (currentRankCumulativePercentage / 100));
            const estimatedRateUpperBound = (currentRankCumulativePercentage - tier.percentage === 0) ? MAX_RATE : (MAX_RATE - (rateRange * ((currentRankCumulativePercentage - tier.percentage) / 100)));

            tierRateEstimates.push({
                name: tier.name,
                lowerRate: Math.max(MIN_RATE, Math.round(estimatedRateLowerBound)),
                upperRate: Math.min(MAX_RATE, Math.round(estimatedRateUpperBound))
            });
        }

        // 実際のレート範囲を考慮して、Tierごとの表示を調整
        // 最上位のTierから順に表示
        for(let i = 0; i < tierRateEstimates.length; i++) {
            const tier = tierRateEstimates[i];
            const lowerRate = tier.lowerRate;
            const upperRate = tier.upperRate;
            const rankRange = tierRankRanges[i];
            tierEstimateHtml += `<tr><td>${tier.name}</td><td>${rankRange.topRank}位～${rankRange.bottomRank}位</td><td>${lowerRate}～${upperRate}</td></tr>`;
        }
        tierEstimateHtml += `</tbody></table>`;
        tierRateEstimatesDiv.innerHTML = tierEstimateHtml;


        // 自分の推定順位を計算 (簡易的)
        // レートが高いほど順位も高いと仮定
        const estimatedPlayerRank = Math.round(totalPlayers * (1 - (currentRate / MAX_RATE))); // レートがMAX_RATEなら1位、0なら最下位に近づく

        // 対戦相手のレート選定と期待レート変動のシミュレーション
        const SIMULATION_MATCHES = 5000; // シミュレーション回数
        let totalRateChangeSum = 0;

        // レート差に応じた相手レートの基準点 (自分のレートを基準とする)
        // これはあくまで「相手とのレート差」の目安として使う仮想的な相手レート
        const opponentRateOffsets = {
            'muchHigher': 100, // かなり高い相手 (例: +100レート差)
            'slightlyHigher': 30, // やや高い相手 (例: +30レート差)
            'equal': 0, // 同等 (例: 0レート差)
            'slightlyLower': -30, // やや低い相手 (例: -30レート差)
            'muchLower': -100 // かなり低い相手 (例: -100レート差)
        };

        for (let i = 0; i < SIMULATION_MATCHES; i++) {
            // 仮想的な対戦相手の選定（上下30人を考慮）
            // 実際はランダムだが、ここでは簡単化のために、各ランク帯の代表レートを使用
            // ユーザーが入力したwinRatesに基づいて、どのレート帯の相手とマッチングするかを決定
            let opponentRateCategory;
            const randMatchup = Math.random(); // 0～1の乱数でマッチングカテゴリを決定
            // ここは一旦、それぞれのカテゴリが20%ずつ均等にマッチングすると仮定します。
            // もし「主に同格とマッチングする」など、対戦頻度の入力が欲しい場合は検討します。
            // 現時点では、勝敗割合の入力だけで「相手レートとの差」をカバーする意図と解釈
            if (randMatchup < 0.2) opponentRateCategory = 'muchHigher';
            else if (randMatchup < 0.4) opponentRateCategory = 'slightlyHigher';
            else if (randMatchup < 0.6) opponentRateCategory = 'equal';
            else if (randMatchup < 0.8) opponentRateCategory = 'slightlyLower';
            else opponentRateCategory = 'muchLower';

            const opponentRate = currentRate + opponentRateOffsets[opponentRateCategory];

            // 相手レートが0未満にならないように調整
            const adjustedOpponentRate = Math.max(0, opponentRate);


            // 勝敗の確率 (ユーザー入力の勝利割合を使用)
            const winProbability = winRates[opponentRateCategory] / 100;
            const didWin = Math.random() < winProbability; // 勝敗をランダムに決定

            let rateChange = 0;
            if (didWin) {
                rateChange = 16 + (adjustedOpponentRate - currentRate) * 0.04;
            } else {
                rateChange = (16 + (currentRate - adjustedOpponentRate) * 0.04) * (-1.0); // 敗北なのでマイナス、比率は1.0
            }
            totalRateChangeSum += rateChange;
        }

        const averageExpectedRateChangePerMatch = totalRateChangeSum / SIMULATION_MATCHES;
        const expectedRate100Matches = currentRate + (averageExpectedRateChangePerMatch * 100);

        // 目標レート達成までの必要勝利数
        const targetRate = currentRate + targetRateIncrease;
        let neededWins = '算出不可';

        if (averageExpectedRateChangePerMatch > 0) {
            neededWins = Math.ceil(targetRateIncrease / averageExpectedRateChangePerMatch);
            if (neededWins < 0) neededWins = 0;
        }


        // --- 3. 詳細なレート変動量の表示 ---
        // 各ランク帯の代表的な相手レートを仮定して計算
        const detailedRateChanges = {};
        for (const category in opponentRateOffsets) {
            const representativeOpponentRate = currentRate + opponentRateOffsets[category];
            const adjustedRepresentativeOpponentRate = Math.max(0, representativeOpponentRate);

            const gain = 16 + (adjustedRepresentativeOpponentRate - currentRate) * 0.04;
            const loss = (16 + (currentRate - adjustedRepresentativeOpponentRate) * 0.04) * (-1.0);
            detailedRateChanges[category] = { gain: gain.toFixed(1), loss: loss.toFixed(1) };
        }

        gainMuchHigherCalculated.textContent = `+${detailedRateChanges.muchHigher.gain}`;
        lossMuchHigherCalculated.textContent = `${detailedRateChanges.muchHigher.loss}`;
        gainSlightlyHigherCalculated.textContent = `+${detailedRateChanges.slightlyHigher.gain}`;
        lossSlightlyHigherCalculated.textContent = `${detailedRateChanges.slightlyHigher.loss}`;
        gainEqualCalculated.textContent = `+${detailedRateChanges.equal.gain}`;
        lossEqualCalculated.textContent = `${detailedRateChanges.equal.loss}`;
        gainSlightlyLowerCalculated.textContent = `+${detailedRateChanges.slightlyLower.gain}`;
        lossSlightlyLowerCalculated.textContent = `${detailedRateChanges.slightlyLower.loss}`;
        gainMuchLowerCalculated.textContent = `+${detailedRateChanges.muchLower.gain}`;
        lossMuchLowerCalculated.textContent = `${detailedRateChanges.muchLower.loss}`;


        // --- 4. 結果の表示 ---
        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        neededWinsForTargetDisplay.textContent = neededWins;
    });
});
