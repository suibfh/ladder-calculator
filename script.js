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
    // ★ 画面コピーの数値を初期値として設定
    // ID名に合わせてキー名も変更
    const initialTierRates = {
        'rateTierMasterTop': 3500,
        'rateTierフロンティアマスターMin': 3062, // IDに合わせる
        'rateTierフロンティアダイヤモンドMin': 2733,
        'rateTierフロンティアプラチナMin': 2628,
        'rateTierゴールド1Min': 2369,
        'rateTierゴールド2Min': 2181,
        'rateTierゴールド3Min': 2074,
        'rateTierシルバー1Min': 1870,
        'rateTierシルバー2Min': 1745,
        'rateTierシルバー3Min': 1659,
        'rateTierブロンズ1Min': 1579,
        'rateTierブロンズ2Min': 1491,
        'rateTierブロンズ3Min': 1029 // IDに合わせる
    };

    function generateTierBoundaryInputs() {
        let html = '';
        html += `<div class="input-group">
                    <label for="rateTierMasterTop">フロンティア マスター (最上位レート):</label>
                    <input type="number" id="rateTierMasterTop" value="${initialTierRates['rateTierMasterTop']}" placeholder="例: 2500" min="0">
                </div>`;
        for (let i = 0; i < TIER_DATA.length - 1; i++) {
            const tier = TIER_DATA[i];
            const tierNameWithoutSpace = tier.name.replace(/\s+/g, '');
            const inputId = `rateTier${tierNameWithoutSpace}Min`; // 生成されるID
            const initialValue = initialTierRates[inputId] !== undefined ? initialTierRates[inputId] : ''; // IDで取得
            html += `<div class="input-group">
                        <label for="${inputId}">${tier.name} (最低レート):</label>
                        <input type="number" id="${inputId}" value="${initialValue}" placeholder="例: ${i === 0 ? '2000' : (1800 - i * 100)}" min="0">
                    </div>`;
        }
        // ブロンズ3の初期値も設定
        const bronze3InputId = 'rateTierブロンズ3Min';
        const bronze3InitialValue = initialTierRates[bronze3InputId] !== undefined ? initialTierRates[bronze3InputId] : 0;
        html += `<div class="input-group">
                    <label for="${bronze3InputId}">ブロンズ 3 (最低レート):</label>
                    <input type="number" id="${bronze3InputId}" value="${bronze3InitialValue}" min="0">
                </div>`;
        tierRateBoundariesDiv.innerHTML = html;
    }

    // DOMContentLoadedリスナー内でTier境界レート入力を生成する
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

        // Tier境界レートの取得と必須チェック
        const inputTierRates = {};
        let missingTierRateInput = false; // 未入力があるかのフラグ

        const masterTopRateInput = document.getElementById('rateTierMasterTop');
        if (masterTopRateInput) { 
            const masterTopRate = parseFloat(masterTopRateInput.value);
            // NaNまたは空文字列（trim()後）の場合に未入力とする
            if (isNaN(masterTopRate) || masterTopRateInput.value.trim() === '') {
                missingTierRateInput = true;
            } else {
                inputTierRates['フロンティア マスター_top'] = masterTopRate; // シミュレーションで使うキー
            }
        } else {
            missingTierRateInput = true; 
        }
        
        for (let i = 0; i < TIER_DATA.length; i++) {
            const tier = TIER_DATA[i];
            const tierName = tier.name;
            const inputId = `rateTier${tierName.replace(/\s+/g, '')}Min`; // 取得するID
            const tierInput = document.getElementById(inputId);
            
            if (tierInput) {
                const rate = parseFloat(tierInput.value);
                // ブロンズ3の0は許容。それ以外のNaNまたは空文字列は未入力とみなす
                if (isNaN(rate) || tierInput.value.trim() === '') {
                    if (!(tierName === 'ブロンズ 3' && tierInput.value.trim() === '0')) {
                        missingTierRateInput = true;
                        break; 
                    } else {
                        inputTierRates[tierName] = 0; // ブロンズ3の0を格納
                    }
                } else {
                    inputTierRates[tierName] = rate; // 正しいレート値を格納
                }
            } else {
                missingTierRateInput = true; 
                break;
            }
        }

        if (missingTierRateInput) {
            alert('Tierの境界レート設定 (任意) のすべての項目を正しく入力してください。\n（半角数字で、空欄がないようにしてください）');
            return;
        }

        // 必須入力項目のチェック (Tier境界レート以外)
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

        // Tierと推定レート帯の目安の算出 (ユーザー入力値のみを使用)
        let tierRateBounds = {}; 
        let prevMaxRate = inputTierRates['フロンティア マスター_top']; // マスターのトップレートから開始

        for (let i = 0; i < TIER_DATA.length; i++) {
            const tier = TIER_DATA[i];
            const tierName = tier.name;
            const minRate = inputTierRates[tierName]; // ここで取得する値は、inputTierRatesに格納されたTierの最低レート
            const maxRate = prevMaxRate; 

            tierRateBounds[tierName] = { min: minRate, max: maxRate };
            prevMaxRate = minRate; // 次のTierの最高レートは、現在のTierの最低レート
        }

        // ユーザー入力のレートが降順になっているか最終チェック
        let prevCheckRate = Infinity;
        for(let i = 0; i < TIER_DATA.length; i++) {
            const tierName = TIER_DATA[i].name;
            const currentTierMinRate = tierRateBounds[tierName].min;

            // 最後のTier（ブロンズ3）以外で、降順チェックを行う
            if (i < TIER_DATA.length - 1 && currentTierMinRate >= prevCheckRate) { 
                alert('Tierの境界レートは降順になるように入力してください。\n（例: 上のTierの最低レートは、その下のTierの最高レートより高く設定してください）');
                return;
            }
            prevCheckRate = currentTierMinRate;
        }
        // ブロンズ3の最低レートは0で固定されるため、ここで特別に上限レートを設定
        if (tierRateBounds['ブロンズ 3']) {
            // ブロンズ3の最大レートは、ブロンズ2の最低レート（prevCheckRateはブロンズ3のループに入る直前のTierのminRate）
            tierRateBounds['ブロンズ 3'].max = inputTierRates[TIER_DATA[TIER_DATA.length - 2].name]; 
            if (tierRateBounds['ブロンズ 3'].max < tierRateBounds['ブロンズ 3'].min) { // もしブロンズ3のminがmaxより高い場合は入れ替える
                const temp = tierRateBounds['ブロンズ 3'].min;
                tierRateBounds['ブロンズ 3'].min = tierRateBounds['ブロンズ 3'].max;
                tierRateBounds['ブロンズ 3'].max = temp;
            }
        }


        // Tierと推定レート帯の目安をテーブルとして表示
        let tierEstimateHtml = `<p>（推定レートは、入力された値に基づきます）</p><table><thead><tr><th>Tier</th><th>順位範囲</th><th>推定レート帯</th></tr></thead><tbody>`;
        for(let i = 0; i < TIER_DATA.length; i++) {
            const tier = TIER_DATA[i];
            const rankLower = (i > 0 ? TIER_DATA[i-1].rankLimit : 0) + 1;
            const rankUpper = tier.rankLimit;

            const estimatedMinRate = tierRateBounds[tier.name].min;
            const estimatedMaxRate = tierRateBounds[tier.name].max;

            tierEstimateHtml += `<tr><td>${tier.name}</td><td>${estimatedMinRate}～${estimatedMaxRate}</td><td>${rankLower}位～${rankUpper}位</td></tr>`; // 順位とレート帯の表示順序を入れ替えてみる
        }
        tierEstimateHtml += `</tbody></table>`;
        tierRateEstimatesDiv.innerHTML = tierEstimateHtml;


        // --- 対戦相手のレート選定と期待レート変動のシミュレーション ---
        const SIMULATION_MATCHES = 10000;
        let totalRateChangeSum = 0;

        let playerTierName = '';
        let playerTierMinRate = 0;
        let playerTierMaxRate = 0;

        // 自分の現在のTierを特定
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
        // Tier境界を外れるレートの特殊処理（最高レートより上、最低レートより下）
        if (!playerTierName) {
            const masterTier = TIER_DATA[0].name;
            const bronze3Tier = TIER_DATA[TIER_DATA.length - 1].name;

            if (currentRate > tierRateBounds[masterTier].max) {
                playerTierName = masterTier; 
                playerTierMinRate = tierRateBounds[masterTier].min;
                playerTierMaxRate = tierRateBounds[masterTier].max;
            } else if (currentRate < tierRateBounds[bronze3Tier].min) {
                playerTierName = bronze3Tier;
                playerTierMinRate = tierRateBounds[bronze3Tier].min;
                playerTierMaxRate = tierRateBounds[bronze3Tier].max;
            } else {
                 playerTierName = bronze3Tier; // 見つからない場合はブロンズ3と仮定（最終的にはこのケースは発生しないはず）
                 playerTierMinRate = tierRateBounds[bronze3Tier].min;
                 playerTierMaxRate = tierRateBounds[bronze3Tier].max;
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
            estimatedPlayerRank = totalPlayers;
        }


        // 順位からレートを推定するヘルパー関数
        const getRateFromRank = (rank, totalPlayers, tierBounds) => {
            const masterTierName = TIER_DATA[0].name;
            const bronze3TierName = TIER_DATA[TIER_DATA.length - 1].name;

            if (rank <= TIER_DATA[0].rankLimit) return tierBounds[masterTierName].max; 
            if (rank > TIER_DATA[TIER_DATA.length - 1].rankLimit) return tierBounds[bronze3TierName].min;

            for (let i = 0; i < TIER_DATA.length; i++) {
                const tier = TIER_DATA[i];
                const lowerRankLimit = (i > 0 ? TIER_DATA[i-1].rankLimit : 0) + 1;
                const upperRankLimit = tier.rankLimit;

                if (rank >= lowerRankLimit && rank <= upperRankLimit) {
                    const tierMinRate = tierBounds[tier.name].min;
                    const tierMaxRate = tierBounds[tier.name].max;
                    
                    const rankInTier = rank - lowerRankLimit;
                    const totalRanksInTier = upperRankLimit - lowerRankLimit + 1;

                    if (totalRanksInTier <= 1) {
                        return Math.round(tierMaxRate);
                    } else {
                        const estimatedRate = tierMaxRate - (tierMaxRate - tierMinRate) * (rankInTier / (totalRanksInTier - 1));
                        return Math.round(estimatedRate);
                    }
                }
            }
            return currentRate;
        };


        for (let i = 0; i < SIMULATION_MATCHES; i++) {
            const opponentRankOffset = Math.floor(Math.random() * 61) - 30;
            let opponentRank = estimatedPlayerRank + opponentRankOffset;

            opponentRank = Math.max(1, opponentRank);
            opponentRank = Math.min(totalPlayers, opponentRank);

            const proximityRange = 50;
            opponentRank = Math.max(1, estimatedPlayerRank - proximityRange, opponentRank);
            opponentRank = Math.min(totalPlayers, estimatedPlayerRank + proximityRange, opponentRank);
            
            opponentRank = Math.max(1, Math.min(totalPlayers, opponentRank));


            const opponentRate = getRateFromRank(opponentRank, totalPlayers, tierRateBounds);
            
            let opponentCategory;
            const rateDiff = currentRate - opponentRate;
            if (rateDiff >= 50) opponentCategory = 'muchLower';
            else if (rateDiff >= 15) opponentCategory = 'slightlyLower';
            else if (rateDiff > -15) opponentCategory = 'equal';
            else if (rateDiff > -50) opponentCategory = 'slightlyHigher';
            else opponentCategory = 'muchHigher';

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
            neededWins = Math.ceil(targetRateIncrease / averageExpectedRateChangePerMatch); 
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