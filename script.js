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
    const lossSlightlyLowerCalculated = document.getElementById('lossSlightlyLowerCalculated');
    const gainMuchLowerCalculated = document.getElementById('gainMuchLowerCalculated');
    const lossMuchLowerCalculated = document.getElementById('lossMuchLowerCalculated');

    const tierRateEstimatesDiv = document.getElementById('tierRateEstimates');

    // --- ゲームのTier割合データ (固定値) ---
    // 提供された正確な人数割合に基づいて調整
    const TIER_DATA = [
        { name: 'フロンティア マスター', percentage: 1, rankLimit: 2 }, // 250人中の2位まで
        { name: 'フロンティア ダイヤモンド', percentage: 4, rankLimit: 12 }, // 250人中の12位まで
        { name: 'フロンティア プラチナ', percentage: 5, rankLimit: 24 },
        { name: 'ゴールド 1', percentage: 6.67, rankLimit: 40 },
        { name: 'ゴールド 2', percentage: 6.67, rankLimit: 56 },
        { name: 'ゴールド 3', percentage: 6.67, rankLimit: 72 },
        { name: 'シルバー 1', percentage: 10, rankLimit: 97 },
        { name: 'シルバー 2', percentage: 10, rankLimit: 122 },
        { name: 'シルバー 3', percentage: 10, rankLimit: 147 },
        { name: 'ブロンズ 1', percentage: 13.30, rankLimit: 182 },
        { name: 'ブロンズ 2', percentage: 13.30, rankLimit: 217 },
        { name: 'ブロンズ 3', percentage: 13.36, rankLimit: 250 } // 合計100%になるように調整 (小数点誤差)
    ];

    // --- Tierの境界レート入力欄を動的に生成 ---
    function generateTierBoundaryInputs() {
        let html = '';
        html += `<div class="input-group">
                    <label for="rateTierMasterTop">フロンティア マスター (最上位レート):</label>
                    <input type="number" id="rateTierMasterTop" value="" placeholder="例: 2500" min="0">
                </div>`;
        for (let i = 0; i < TIER_DATA.length - 1; i++) { // ブロンズ3以外
            const tier = TIER_DATA[i];
            // 各Tierの最低レートを入力させる
            html += `<div class="input-group">
                        <label for="rateTier${tier.name.replace(/\s+/g, '')}Min">${tier.name} (最低レート):</label>
                        <input type="number" id="rateTier${tier.name.replace(/\s+/g, '')}Min" value="" placeholder="例: ${i === 0 ? '2000' : (1800 - i * 100)}" min="0">
                    </div>`;
        }
        // 最下位Tierの最低レートは0と仮定するか、入力させるか
        html += `<div class="input-group">
                    <label for="rateTierBronze3Min">ブロンズ 3 (最低レート):</label>
                    <input type="number" id="rateTierBronze3Min" value="0" min="0">
                </div>`;
        tierRateBoundariesDiv.innerHTML = html;
    }

    generateTierBoundaryInputs(); // ページロード時に生成

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

        // Tier境界レートの取得
        const customTierRates = {};
        let allTierRatesProvided = true;
        customTierRates['フロンティアマスターTop'] = parseFloat(document.getElementById('rateTierMasterTop').value);
        if (isNaN(customTierRates['フロンティアマスターTop'])) allTierRatesProvided = false;

        for (let i = 0; i < TIER_DATA.length; i++) {
            const tierName = TIER_DATA[i].name;
            const inputId = `rateTier${tierName.replace(/\s+/g, '')}Min`;
            const rate = parseFloat(document.getElementById(inputId).value);
            if (isNaN(rate)) allTierRatesProvided = false;
            customTierRates[tierName] = rate;
        }

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
        let tierRateBounds = {}; // 各Tierの最低/最高レートを格納

        if (allTierRatesProvided) {
            // ユーザーがすべてのTier境界レートを入力した場合
            const tierNames = TIER_DATA.map(t => t.name);
            for (let i = 0; i < tierNames.length; i++) {
                const tierName = tierNames[i];
                const minRate = customTierRates[tierName];
                const maxRate = (i === 0) ? customTierRates['フロンティアマスターTop'] : customTierRates[tierNames[i - 1]]; // 1つ上のTierのminRateがそのTierのmaxRate
                
                // Tierの上限と下限レートを格納
                tierRateBounds[tierName] = { min: minRate, max: maxRate };
            }
            // マスターの最上位レートは特別扱い
            tierRateBounds['フロンティア マスター'].max = customTierRates['フロンティアマスターTop'];

            // ユーザー入力の逆順レートチェック（降順になっているか）
            let prevRate = Infinity;
            for(const tierName of tierNames) {
                if (tierRateBounds[tierName].min > prevRate) {
                    alert('Tierの境界レートは降順になるように入力してください。');
                    return;
                }
                prevRate = tierRateBounds[tierName].min;
            }


        } else {
            // ユーザーがTier境界レートを入力しない場合、参加人数とTier割合から推定
            // 最上位レートと最下位レートを仮定 (例: 2500～0)
            const MAX_RATE = 2500;
            const MIN_RATE = 0;
            const rateRange = MAX_RATE - MIN_RATE;

            let currentCumulativePercentage = 0;
            for (let i = 0; i < TIER_DATA.length; i++) {
                const tier = TIER_DATA[i];
                const prevCumulativePercentage = currentCumulativePercentage;
                currentCumulativePercentage += tier.percentage;

                const estimatedMinRate = Math.max(MIN_RATE, Math.round(MAX_RATE - (rateRange * (currentCumulativePercentage / 100))));
                const estimatedMaxRate = (i === 0) ? MAX_RATE : Math.round(MAX_RATE - (rateRange * (prevCumulativePercentage / 100)));

                tierRateBounds[tier.name] = { min: estimatedMinRate, max: estimatedMaxRate };
            }
        }
        
        // Tierと推定レート帯の目安をテーブルとして表示
        let tierEstimateHtml = `<p>（推定レートは、レートが均等に分布すると仮定した場合、または入力された値に基づきます）</p><table><thead><tr><th>Tier</th><th>順位範囲</th><th>推定レート帯</th></tr></thead><tbody>`;
        let currentTopRank = 1;
        for(let i = 0; i < TIER_DATA.length; i++) {
            const tier = TIER_DATA[i];
            const numPlayersInTier = tier.rankLimit - (i > 0 ? TIER_DATA[i-1].rankLimit : 0); // 各Tierの人数
            const bottomRank = tier.rankLimit;

            const estimatedMinRate = tierRateBounds[tier.name].min;
            const estimatedMaxRate = tierRateBounds[tier.name].max;

            tierEstimateHtml += `<tr><td>${tier.name}</td><td>${currentTopRank}位～${bottomRank}位</td><td>${estimatedMinRate}～${estimatedMaxRate}</td></tr>`;
            currentTopRank = bottomRank + 1;
        }
        tierEstimateHtml += `</tbody></table>`;
        tierRateEstimatesDiv.innerHTML = tierEstimateHtml;

        // --- 対戦相手のレート選定と期待レート変動のシミュレーション ---
        const SIMULATION_MATCHES = 10000; // シミュレーション回数を増やす
        let totalRateChangeSum = 0;

        // 自分の現在のTierを特定
        let playerTierName = '';
        let playerTierMinRate = 0;
        let playerTierMaxRate = 0;
        for (const tierName in tierRateBounds) {
            if (currentRate >= tierRateBounds[tierName].min && currentRate <= tierRateBounds[tierName].max) {
                playerTierName = tierName;
                playerTierMinRate = tierRateBounds[tierName].min;
                playerTierMaxRate = tierRateBounds[tierName].max;
                break;
            }
        }
        if (!playerTierName && currentRate > tierRateBounds[TIER_DATA[0].name].max) { // マスターより上の場合
            playerTierName = TIER_DATA[0].name;
            playerTierMinRate = tierRateBounds[TIER_DATA[0].name].min;
            playerTierMaxRate = tierRateBounds[TIER_DATA[0].name].max;
        }


        // 自分の順位を推定 (Tier情報とレートから)
        let estimatedPlayerRank = 1;
        if (playerTierName) {
            const currentTierIndex = TIER_DATA.findIndex(t => t.name === playerTierName);
            const lowerTierRankLimit = (currentTierIndex > 0) ? TIER_DATA[currentTierIndex - 1].rankLimit : 0;
            const currentTierPlayersCount = TIER_DATA[currentTierIndex].rankLimit - lowerTierRankLimit;
            
            // Tier内のレート範囲と自分のレートから、Tier内での相対的な位置を計算
            if (playerTierMaxRate !== playerTierMinRate) {
                const normalizedRate = (currentRate - playerTierMinRate) / (playerTierMaxRate - playerTierMinRate);
                estimatedPlayerRank = Math.round(lowerTierRankLimit + currentTierPlayersCount * (1 - normalizedRate));
            } else { // Tierのレート範囲が0の場合 (例: 最上位Tierの1人のみ)
                estimatedPlayerRank = TIER_DATA[currentTierIndex].rankLimit;
            }
            estimatedPlayerRank = Math.max(1, Math.min(totalPlayers, estimatedPlayerRank)); // 1位～総人数に収める
        } else { // どのTierにも属さないレートの場合 (例: 0未満など)
            estimatedPlayerRank = totalPlayers; // 最下位と仮定
        }


        // 対戦相手のレートをシミュレートする関数
        const getOpponentRate = (playerRank, totalPlayers, tierBounds) => {
            const opponentRankOffset = Math.floor(Math.random() * 61) - 30; // -30 から +30 の範囲でランダムな順位差
            let opponentRank = playerRank + opponentRankOffset;

            // 順位範囲の調整
            if (playerRank <= 30) { // 1位～30位のプレイヤー
                opponentRank = Math.max(opponentRank, 1); // 1位より下には行かない
                opponentRank = Math.min(opponentRank, Math.min(totalPlayers, 31)); // 31位までしか選ばれない
            } else if (playerRank >= totalPlayers - 29) { // 最下位30位のプレイヤー
                opponentRank = Math.max(opponentRank, Math.max(1, totalPlayers - 30)); // 最下位から30位上まで
                opponentRank = Math.min(opponentRank, totalPlayers); // 最下位より上には行かない
            } else { // それ以外のプレイヤー
                opponentRank = Math.max(opponentRank, playerRank - 30);
                opponentRank = Math.min(opponentRank, playerRank + 30);
            }
            opponentRank = Math.max(1, Math.min(totalPlayers, opponentRank)); // 念のため1～総人数に収める

            // 順位からレートを推定
            // 参加人数とTier境界レートを用いて、順位から逆算してレートを推定する
            // 簡略化のため、Tierの割合とレート範囲を線形に割り振る（ユーザーがTierレートを入力した場合はより正確）
            for (const tierName in tierRateBounds) {
                const tierData = TIER_DATA.find(t => t.name === tierName);
                if (!tierData) continue;

                const lowerRank = (TIER_DATA.findIndex(t => t.name === tierName) > 0) ? TIER_DATA[TIER_DATA.findIndex(t => t.name === tierName) - 1].rankLimit + 1 : 1;
                const upperRank = tierData.rankLimit;

                if (opponentRank >= lowerRank && opponentRank <= upperRank) {
                    const tierMinRate = tierRateBounds[tierName].min;
                    const tierMaxRate = tierRateBounds[tierName].max;
                    
                    // Tier内の順位からレートを線形補間
                    const rankInTier = opponentRank - lowerRank;
                    const totalRanksInTier = upperRank - lowerRank + 1;
                    if (totalRanksInTier > 0) {
                        // レートが高いほど順位が高いので、レートは逆順に割り当てる
                        const estimatedOpponentRate = tierMaxRate - (tierMaxRate - tierMinRate) * (rankInTier / totalRanksInTier);
                        return Math.round(estimatedOpponentRate);
                    } else { // 1人しかいないTierの場合など
                        return Math.round(tierMaxRate);
                    }
                }
            }
            return currentRate; // 万が一見つからなければ自分のレートを返す（フォールバック）
        };


        for (let i = 0; i < SIMULATION_MATCHES; i++) {
            const opponentRate = getOpponentRate(estimatedPlayerRank, totalPlayers, tierRateBounds);
            
            // 相手レートと自分のレートの差に応じたカテゴリを判定
            let opponentCategory;
            const rateDiff = currentRate - opponentRate;
            if (rateDiff >= 50) opponentCategory = 'muchLower'; // 自分がかなり高い
            else if (rateDiff >= 15) opponentCategory = 'slightlyLower'; // 自分がやや高い
            else if (rateDiff >= -15) opponentCategory = 'equal'; // ほぼ同等
            else if (rateDiff >= -50) opponentCategory = 'slightlyHigher'; // 相手がやや高い
            else opponentCategory = 'muchHigher'; // 相手がかなり高い

            // 勝敗の確率 (ユーザー入力の勝利割合を使用)
            const winProbability = winRates[opponentCategory] / 100;
            const didWin = Math.random() < winProbability; // 勝敗をランダムに決定

            let rateChange = 0;
            if (didWin) {
                rateChange = 16 + (opponentRate - currentRate) * 0.04;
            } else {
                rateChange = (16 + (currentRate - opponentRate) * 0.04) * (-1.0); // 敗北なのでマイナス、比率は1.0
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
        } else if (targetRateIncrease <= 0) { // 目標増加量が0以下なら0勝
             neededWins = 0;
        }


        // --- 3. 詳細なレート変動量の表示 ---
        // 各カテゴリの代表的な相手レートを仮定して計算 (自身のレートとの差を基に)
        const detailedRateChanges = {};
        const baseRateDiffs = { // 自分と相手のレート差
            'muchHigher': -100, // 相手が100高い
            'slightlyHigher': -30, // 相手が30高い
            'equal': 0,
            'slightlyLower': 30, // 相手が30低い
            'muchLower': 100 // 相手が100低い
        };

        for (const category in baseRateDiffs) {
            const opponentRate = currentRate + baseRateDiffs[category];
            const adjustedOpponentRate = Math.max(0, opponentRate); // レートが0未満にならないように調整

            const gain = 16 + (adjustedOpponentRate - currentRate) * 0.04;
            const loss = (16 + (currentRate - adjustedOpponentRate) * 0.04) * (-1.0);
            detailedRateChanges[category] = { gain: gain.toFixed(1), loss: loss.toFixed(1) };
        }

        gainMuchHigherCalculated.textContent = `+${detailedRateChanges.muchHigher.gain}`;
        lossMuchHigherCalculated.textContent = `${detailedRateChanges.muchHigher.loss}`;
        gainSlightlyHigherCalculated.textContent = `+${detailedRateChanges.slightlyHigher.gain}`;
        lossSlightlyHigherCalculated.textContent = `${detailedRateChanges.slightlyHigher.loss}`;
        gainEqualCalculated.textContent = `+${detailedRateChanges.equal.gain}`;
        lossEqualCalculated.textContent = `${detailedRateChanges.equal.loss}`;
        gainSlightlyLowerCalculated.textContent = `+${detailedRateChanges.gainSlightlyLower}`;
        lossSlightlyLowerCalculated.textContent = `${detailedRateChanges.lossSlightlyLower}`;
        gainMuchLowerCalculated.textContent = `+${detailedRateChanges.gainMuchLower}`;
        lossMuchLowerCalculated.textContent = `${detailedRateChanges.lossMuchLower}`;


        // --- 4. 結果の表示 ---
        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        neededWinsForTargetDisplay.textContent = neededWins;
    });
});
