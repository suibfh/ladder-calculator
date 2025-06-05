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
    const lossMuchHigherCalculated = document = document.getElementById('lossMuchHigherCalculated'); // 修正済み
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
    const TIER_DATA = [
        { name: 'フロンティア マスター', percentage: 1, rankLimit: 2 },
        { name: 'フロンティア ダイヤモンド', percentage: 4, rankLimit: 12 },
        { name: 'フロンティア プラチナ', percentage: 5, rankLimit: 24 },
        { name: 'ゴールド 1', percentage: 6.67, rankLimit: 40 },
        { name: 'ゴールド 2', percentage: 6.67, rankLimit: 56 },
        { name: 'ゴールド 3', percentage: 6.67, rankLimit: 72 },
        { name: 'シルバー 1', percentage: 10, rankLimit: 97 },
        { name: 'シルバー 2', percentage: 10, rankLimit: 122 },
        { name: 'シルバー 3', percentage: 10, rankLimit: 147 },
        { name: 'ブロンズ 1', percentage: 13.30, rankLimit: 182 },
        { name: 'ブロンズ 2', percentage: 13.30, rankLimit: 217 },
        { name: 'ブロンズ 3', percentage: 13.36, rankLimit: 250 }
    ];

    // --- Tierの境界レート入力欄を動的に生成 ---
    function generateTierBoundaryInputs() {
        let html = '';
        html += `<div class="input-group">
                    <label for="rateTierMasterTop">フロンティア マスター (最上位レート):</label>
                    <input type="number" id="rateTierMasterTop" value="" placeholder="例: 2500" min="0">
                </div>`;
        for (let i = 0; i < TIER_DATA.length - 1; i++) {
            const tier = TIER_DATA[i];
            html += `<div class="input-group">
                        <label for="rateTier${tier.name.replace(/\s+/g, '')}Min">${tier.name} (最低レート):</label>
                        <input type="number" id="rateTier${tier.name.replace(/\s+/g, '')}Min" value="" placeholder="例: ${i === 0 ? '2000' : (1800 - i * 100)}" min="0">
                    </div>`;
        }
        html += `<div class="input-group">
                    <label for="rateTierBronze3Min">ブロンズ 3 (最低レート):</label>
                    <input type="number" id="rateTierBronze3Min" value="0" min="0">
                </div>`;
        tierRateBoundariesDiv.innerHTML = html;
    }

    generateTierBoundaryInputs();

    // --- 計算実行関数 ---
    calculateButton.addEventListener('click', () => {
        // --- 1. 入力値の取得とバリデーション ---
        const wins = parseInt(winsInput.value) || 0;
        const losses = parseInt(lossesInput.value) || 0;
        const currentRate = parseFloat(currentRateInput.value);
        const targetRateIncrease = parseFloat(targetRateIncreaseInput.value) || 0;
        const totalPlayers = parseInt(totalPlayersInput.value);
        const rateDiffCoefficient = 0.04; // 公式ヘルプより固定値

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

        const masterTopRateInput = document.getElementById('rateTierMasterTop');
        if (masterTopRateInput) {
            const masterTopRate = parseFloat(masterTopRateInput.value);
            if (isNaN(masterTopRate) || masterTopRateInput.value === '') {
                allTierRatesProvided = false;
            } else {
                customTierRates['フロンティアマスターTop'] = masterTopRate;
            }
        } else {
            allTierRatesProvided = false;
        }
        
        for (let i = 0; i < TIER_DATA.length; i++) {
            const tierName = TIER_DATA[i].name;
            const inputId = `rateTier${tierName.replace(/\s+/g, '')}Min`;
            const tierInput = document.getElementById(inputId);
            
            if (tierInput) {
                const rate = parseFloat(tierInput.value);
                if (tierInput.value === '0' && tierName === 'ブロンズ 3') { // ブロンズ3の0は有効な入力とみなす
                     customTierRates[tierName] = 0;
                } else if (isNaN(rate) || tierInput.value === '') { // 空欄または不正な値は未提供と判断
                    allTierRatesProvided = false;
                } else {
                    customTierRates[tierName] = rate;
                }
            } else {
                allTierRatesProvided = false;
            }
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

        const totalMatches = wins + losses;
        const currentWinRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

        // Tierと推定レート帯の目安の算出
        let tierRateBounds = {}; // 各Tierの最低/最高レートを格納

        if (allTierRatesProvided) {
            // ユーザーがすべてのTier境界レートを入力した場合、その値を優先
            const tierNames = TIER_DATA.map(t => t.name);
            
            // 最上位Tierのトップレートから順に境界を設定
            let prevMaxRate = customTierRates['フロンティアマスターTop'];

            for (let i = 0; i < tierNames.length; i++) { // マスターからブロンズ3へ順に処理
                const tierName = tierNames[i];
                const minRate = customTierRates[tierName];
                const maxRate = prevMaxRate; 

                tierRateBounds[tierName] = { min: minRate, max: maxRate };
                prevMaxRate = minRate; // 次のTierの最高レートは、現在のTierの最低レート
            }

            // ユーザー入力の逆順レートチェック（降順になっているか）
            let prevCheckRate = Infinity;
            for(const tierName of tierNames) {
                if (tierRateBounds[tierName].min > prevCheckRate) {
                    alert('Tierの境界レートは降順になるように入力してください。');
                    return;
                }
                prevCheckRate = tierRateBounds[tierName].min;
            }

        } else {
            // ユーザーがTier境界レートを入力しない場合、参加人数とTier割合から推定
            const MAX_RATE_ESTIMATE = 2500; // 仮の最高レート
            const MIN_RATE_ESTIMATE = 0;    // 仮の最低レート
            const rateRangeEstimate = MAX_RATE_ESTIMATE - MIN_RATE_ESTIMATE;

            let currentCumulativePercentage = 0;
            // 下位Tierから順にレートを推定
            for (let i = TIER_DATA.length - 1; i >= 0; i--) {
                const tier = TIER_DATA[i];
                const prevCumulativePercentage = currentCumulativePercentage;
                currentCumulativePercentage += tier.percentage;

                const estimatedMaxRate = Math.min(MAX_RATE_ESTIMATE, Math.round(MIN_RATE_ESTIMATE + (rateRangeEstimate * (currentCumulativePercentage / 100))));
                const estimatedMinRate = (i === TIER_DATA.length - 1) ? MIN_RATE_ESTIMATE : Math.round(MIN_RATE_ESTIMATE + (rateRangeEstimate * (prevCumulativePercentage / 100)));

                tierRateBounds[tier.name] = { min: estimatedMinRate, max: estimatedMaxRate };
            }
            // マスターの最高レートを明示的に設定
            tierRateBounds['フロンティア マスター'].max = MAX_RATE_ESTIMATE;
        }
        
        // Tierと推定レート帯の目安をテーブルとして表示
        let tierEstimateHtml = `<p>（推定レートは、レートが均等に分布すると仮定した場合、または入力された値に基づきます）</p><table><thead><tr><th>Tier</th><th>順位範囲</th><th>推定レート帯</th></tr></thead><tbody>`;
        let currentTopRank = 1;
        for(let i = 0; i < TIER_DATA.length; i++) {
            const tier = TIER_DATA[i];
            // ランク範囲はTIER_DATAから取得
            const rankLower = (i > 0 ? TIER_DATA[i-1].rankLimit : 0) + 1;
            const rankUpper = tier.rankLimit;

            const estimatedMinRate = tierRateBounds[tier.name].min;
            const estimatedMaxRate = tierRateBounds[tier.name].max;

            tierEstimateHtml += `<tr><td>${tier.name}</td><td>${rankLower}位～${rankUpper}位</td><td>${estimatedMinRate}～${estimatedMaxRate}</td></tr>`;
            currentTopRank = tier.rankLimit + 1;
        }
        tierEstimateHtml += `</tbody></table>`;
        tierRateEstimatesDiv.innerHTML = tierEstimateHtml;


        // --- 対戦相手のレート選定と期待レート変動のシミュレーション ---
        const SIMULATION_MATCHES = 10000;
        let totalRateChangeSum = 0;

        let playerTierName = '';
        let playerTierMinRate = 0;
        let playerTierMaxRate = 0;

        // 自分の現在のTierを特定 (tierRateBoundsは既に確定済み)
        for (const tierName in tierRateBounds) {
            const min = Math.min(tierRateBounds[tierName].min, tierRateBounds[tierName].max);
            const max = Math.max(tierRateBounds[tierName].min, tierRateBounds[tierName].max);

            if (currentRate >= min && currentRate <= max) {
                playerTierName = tierName;
                playerTierMinRate = min;
                playerTierMaxRate = max;
                break;
            }
        }
        // Tier境界を外れるレートの特殊処理 (tierRateBounds確定後に処理)
        if (!playerTierName) {
            const overallMinRate = TIER_DATA.reduce((min, t) => Math.min(min, tierRateBounds[t.name].min), Infinity);
            const overallMaxRate = TIER_DATA.reduce((max, t) => Math.max(max, tierRateBounds[t.name].max), -Infinity);

            if (currentRate > overallMaxRate) {
                playerTierName = TIER_DATA[0].name; // マスターに分類
                playerTierMinRate = tierRateBounds[TIER_DATA[0].name].min;
                playerTierMaxRate = tierRateBounds[TIER_DATA[0].name].max;
            } else if (currentRate < overallMinRate) {
                playerTierName = TIER_DATA[TIER_DATA.length - 1].name; // ブロンズ3に分類
                playerTierMinRate = tierRateBounds[TIER_DATA[TIER_DATA.length - 1].name].min;
                playerTierMaxRate = tierRateBounds[TIER_DATA[TIER_DATA.length - 1].name].max;
            } else {
                 playerTierName = TIER_DATA[TIER_DATA.length - 1].name; // それでも見つからない場合、ブロンズ3と仮定
                 playerTierMinRate = tierRateBounds[TIER_DATA[TIER_DATA.length - 1].name].min;
                 playerTierMaxRate = tierRateBounds[TIER_DATA[TIER_DATA.length - 1].name].max;
            }
        }

        // 自分の順位を推定
        let estimatedPlayerRank = 1;
        if (playerTierName) {
            const currentTierData = TIER_DATA.find(t => t.name === playerTierName);
            const currentTierIndex = TIER_DATA.indexOf(currentTierData);
            
            const lowerRankLimitOfPrevTier = (currentTierIndex > 0) ? TIER_DATA[currentTierIndex - 1].rankLimit : 0;
            const currentTierPlayersCount = currentTierData.rankLimit - lowerRankLimitOfPrevTier;
            
            if (playerTierMaxRate !== playerTierMinRate) {
                const normalizedRate = (currentRate - playerTierMinRate) / (playerTierMaxRate - playerTierMinRate);
                const relativeRankInTier = 1 - normalizedRate; 
                estimatedPlayerRank = Math.round(lowerRankLimitOfPrevTier + (currentTierPlayersCount * relativeRankInTier));
            } else { 
                estimatedPlayerRank = currentTierData.rankLimit;
            }
            estimatedPlayerRank = Math.max(1, Math.min(totalPlayers, estimatedPlayerRank));
        } else {
            estimatedPlayerRank = totalPlayers; // Tier特定できなかった場合のフォールバック
        }


        // 順位からレートを推定するヘルパー関数
        const getRateFromRank = (rank, totalPlayers, tierBounds) => {
            // 最上位/最下位順位のレートを正確に返す
            if (rank <= TIER_DATA[0].rankLimit) return tierBounds[TIER_DATA[0].name].max; // マスターのトップレート
            if (rank > TIER_DATA[TIER_DATA.length - 1].rankLimit) return tierBounds[TIER_DATA[TIER_DATA.length - 1].name].min; // ブロンズ3の最低レート

            for (let i = 0; i < TIER_DATA.length; i++) {
                const tier = TIER_DATA[i];
                const lowerRankLimit = (i > 0 ? TIER_DATA[i-1].rankLimit : 0) + 1;
                const upperRankLimit = tier.rankLimit;

                if (rank >= lowerRankLimit && rank <= upperRankLimit) {
                    const tierMinRate = tierBounds[tier.name].min;
                    const tierMaxRate = tierBounds[tier.name].max;
                    
                    const rankInTier = rank - lowerRankLimit;
                    const totalRanksInTier = upperRankLimit - lowerRankLimit + 1;

                    if (totalRanksInTier <= 1) { // そのTierに1人しかいない場合
                        return Math.round(tierMaxRate);
                    } else {
                        // 線形補間
                        const estimatedRate = tierMaxRate - (tierMaxRate - tierMinRate) * (rankInTier / (totalRanksInTier - 1));
                        return Math.round(estimatedRate);
                    }
                }
            }
            return currentRate; // フォールバック (本来はここには来ないはず)
        };


        for (let i = 0; i < SIMULATION_MATCHES; i++) {
            // 対戦相手の順位を選定 (上下30人)
            const opponentRankOffset = Math.floor(Math.random() * 61) - 30;
            let opponentRank = estimatedPlayerRank + opponentRankOffset;

            // 順位の上限・下限の調整（全プレイヤー数も考慮）
            opponentRank = Math.max(1, opponentRank);
            opponentRank = Math.min(totalPlayers, opponentRank);

            // シミュレーション対象プレイヤーに近い相手を選ぶ
            if (estimatedPlayerRank <= 31) { // プレイヤーが上位31位以内にいる場合
                opponentRank = Math.min(opponentRank, Math.min(totalPlayers, 61)); // 上位61位までに限定
            } else if (estimatedPlayerRank >= totalPlayers - 30) { // プレイヤーが下位31位以内にいる場合
                opponentRank = Math.max(opponentRank, Math.max(1, totalPlayers - 60)); // 下位61位までに限定
            } else { // プレイヤーが中間にいる場合
                opponentRank = Math.max(opponentRank, estimatedPlayerRank - 30);
                opponentRank = Math.min(opponentRank, estimatedPlayerRank + 30);
            }
            opponentRank = Math.max(1, Math.min(totalPlayers, opponentRank));


            const opponentRate = getRateFromRank(opponentRank, totalPlayers, tierRateBounds);
            
            // 相手レートと自分のレートの差に応じたカテゴリを判定
            let opponentCategory;
            const rateDiff = currentRate - opponentRate;
            if (rateDiff >= 50) opponentCategory = 'muchLower';
            else if (rateDiff >= 15) opponentCategory = 'slightlyLower';
            else if (rateDiff > -15) opponentCategory = 'equal';
            else if (rateDiff > -50) opponentCategory = 'slightlyHigher';
            else opponentCategory = 'muchHigher';

            // 勝敗の確率 (ユーザー入力の勝利割合を使用)
            const winProbability = winRates[opponentCategory] / 100;
            const didWin = Math.random() < winProbability;

            let rateChange = 0;
            if (didWin) {
                rateChange = 16 + (opponentRate - currentRate) * rateDiffCoefficient;
                if (rateChange < 1) rateChange = 1;
            } else {
                rateChange = (16 + (currentRate - opponentRate) * rateDiffCoefficient) * (-1.0);
                if (rateChange > -1) rateChange = -1;
            }
            totalRateChangeSum += rateChange;
        }

        const averageExpectedRateChangePerMatch = totalRateChangeSum / SIMULATION_MATCHES;
        const expectedRate100Matches = currentRate + (averageExpectedRateChangePerMatch * 100);

        // 目標レート達成までの必要勝利数
        const targetRate = currentRate + targetRateIncrease;
        let neededWins = '算出不可';

        if (averageExpectedRateChangePerMatch > 0) {
            neededWins = Math.ceil(targetRateIncrease / averageExpectedRateRateChangePerMatch); // 間違ってaverageExpectedRateChangePerMatchが2回書かれてたのを修正
            if (neededWins < 0) neededWins = 0;
        } else if (targetRateIncrease <= 0) {
             neededWins = 0;
        }


        // --- 3. 詳細なレート変動量の表示 ---
        const detailedRateChanges = {};
        const baseRateDiffs = {
            'muchHigher': 100,
            'slightlyHigher': 30,
            'equal': 0,
            'slightlyLower': -30,
            'muchLower': -100
        };

        for (const category in baseRateDiffs) {
            const simulatedOpponentRate = currentRate + baseRateDiffs[category];
            const adjustedOpponentRate = Math.max(0, simulatedOpponentRate);

            let gain = 16 + (adjustedOpponentRate - currentRate) * rateDiffCoefficient;
            if (gain < 1) gain = 1;

            let loss = (16 + (currentRate - adjustedOpponentRate) * rateDiffCoefficient) * (-1.0);
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
