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

    // --- ゲームのTier割合データ (公式情報に基づく修正) ---
    const TIER_DATA = [
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
        { name: 'ブロンズ 3', percentage: 13.30 } // 公式情報に合わせて13.30%に修正
    ];

    // --- Tierの境界レート入力欄を動的に生成するための初期値 ---
    const initialTierRates = {
        'rateTierMasterTop': 3500,
        'rateTierフロンティアマスターMin': 3062,
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
        'rateTierブロンズ3Min': 0 // ブロンズ3の最低レートは0が妥当なため修正
    };

    function generateTierBoundaryInputs() {
        let html = '';
        // フロンティア マスター (最上位レート) は特別な入力として追加
        html += `<div class="input-group">
                    <label for="rateTierMasterTop">フロンティア マスター (最上位レート):</label>
                    <input type="number" id="rateTierMasterTop" value="${initialTierRates['rateTierMasterTop']}" placeholder="例: 2500" min="0">
                </div>`;
        
        // 各Tierの最低レート入力欄を生成
        for (let i = 0; i < TIER_DATA.length; i++) { // ブロンズ3まで含める
            const tier = TIER_DATA[i];
            const tierNameWithoutSpace = tier.name.replace(/\s+/g, '');
            const inputId = `rateTier${tierNameWithoutSpace}Min`;
            const initialValue = initialTierRates[inputId] !== undefined ? initialTierRates[inputId] : '';
            html += `<div class="input-group">
                        <label for="${inputId}">${tier.name} (最低レート):</label>
                        <input type="number" id="${inputId}" value="${initialValue}" placeholder="例: ${initialValue || ''}" min="0">
                    </div>`;
        }
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
        const overallWinLossRatio = 1.0; // 「ランクマッチ全体の勝利数/ランクマッチ全体の敗北数」は1.0で固定

        const winRates = {
            'muchHigher': parseFloat(winRateVsMuchHigherInput.value),
            'slightlyHigher': parseFloat(winRateVsSlightlyHigherInput.value),
            'equal': parseFloat(winRateVsEqualInput.value),
            'slightlyLower': parseFloat(winRateVsSlightlyLowerInput.value),
            'muchLower': parseFloat(winRateVsMuchLowerInput.value)
        };

        // 必須入力項目のチェック (現在のレート、参加人数、勝率割合)
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


        // Tier境界レートの取得とバリデーション (未入力の場合は推定するロジックに変更)
        let inputTierRates = {};
        let allTierRatesEntered = true; // 全てのTier境界レートが入力されているか

        const masterTopRateInput = document.getElementById('rateTierMasterTop');
        const masterTopRate = parseFloat(masterTopRateInput.value);
        if (isNaN(masterTopRate) || masterTopRateInput.value.trim() === '') {
            allTierRatesEntered = false;
        } else {
            inputTierRates['フロンティア マスター_top'] = masterTopRate;
        }
        
        for (let i = 0; i < TIER_DATA.length; i++) {
            const tier = TIER_DATA[i];
            const tierName = tier.name;
            const inputId = `rateTier${tierName.replace(/\s+/g, '')}Min`;
            const tierInput = document.getElementById(inputId);
            
            if (tierInput) {
                const rate = parseFloat(tierInput.value);
                // ブロンズ3の0は許容するが、それ以外はNaNまたは空文字列の場合に未入力とみなす
                if (isNaN(rate) || tierInput.value.trim() === '') {
                    if (!(tierName === 'ブロンズ 3' && tierInput.value.trim() === '0')) {
                        allTierRatesEntered = false;
                    } else {
                        inputTierRates[tierName] = 0; // ブロンズ3の0を格納
                    }
                } else {
                    inputTierRates[tierName] = rate;
                }
            } else {
                allTierRatesEntered = false;
            }
            if (!allTierRatesEntered) break; // 未入力が見つかったらループを抜ける
        }


        let tierRateBounds = {};
        if (allTierRatesEntered) {
            // ユーザーがすべてのTier境界レートを入力した場合
            let prevMaxRate = inputTierRates['フロンティア マスター_top'];

            for (let i = 0; i < TIER_DATA.length; i++) {
                const tier = TIER_DATA[i];
                const tierName = tier.name;
                const minRate = inputTierRates[tierName];
                const maxRate = prevMaxRate; 

                tierRateBounds[tierName] = { min: minRate, max: maxRate };
                prevMaxRate = minRate;
            }

            // ユーザー入力のレートが降順になっているか最終チェック
            let prevCheckRate = Infinity;
            for(let i = 0; i < TIER_DATA.length; i++) { // ブロンズ3まで含めてチェック
                const tierName = TIER_DATA[i].name;
                const currentTierMinRate = tierRateBounds[tierName].min;

                if (i > 0 && currentTierMinRate >= prevCheckRate) { // 最初のTier以外でチェック
                    alert('Tierの境界レートは降順になるように入力してください。\n（例: 上のTierの最低レートは、その下のTierの最高レートより高く設定してください）');
                    return;
                }
                prevCheckRate = currentTierMinRate;
            }
             // ブロンズ3の最大レートはブロンズ2の最低レート
            const bronze2MinRate = inputTierRates[TIER_DATA[TIER_DATA.length - 2].name]; 
            if (tierRateBounds['ブロンズ 3']) { // ブロンズ3のキーが存在するか確認
                tierRateBounds['ブロンズ 3'].max = bronze2MinRate;
            } else {
                // エラーハンドリングまたはデフォルト値設定
                console.error("ブロンズ3のTier境界レートが設定されていません。");
            }
        } else {
            // 未入力の場合は参加人数とTier割合から自動で推定
            alert('Tierの境界レートが未入力のため、参加人数とTier割合から自動で推定します。');
            
            // TIER_DATAにrankLimitを再計算して追加
            let cumulativePlayers = 0;
            TIER_DATA.forEach(tier => {
                const playersInTier = Math.round(totalPlayers * (tier.percentage / 100));
                cumulativePlayers += playersInTier;
                tier.rankLimit = cumulativePlayers; // 順位上限を計算
            });
            // 最後のTierのrankLimitがtotalPlayersと一致するように調整
            TIER_DATA[TIER_DATA.length - 1].rankLimit = totalPlayers;


            // 簡単な線形補間でレートを推定
            const maxOverallRate = initialTierRates['rateTierMasterTop'] || 3500; // 初期値から取得、なければデフォルト
            const minOverallRate = initialTierRates['rateTierブロンズ3Min'] || 1000; // 初期値から取得、なければデフォルト
            const rateRange = maxOverallRate - minOverallRate;

            let prevRankLimit = 0;
            for (let i = 0; i < TIER_DATA.length; i++) {
                const tier = TIER_DATA[i];
                
                const lowerRankLimit = prevRankLimit + 1;
                const upperRankLimit = tier.rankLimit;

                // ランク帯の中央値をレートにマッピング
                const rankMidpoint = (lowerRankLimit + upperRankLimit) / 2;
                const normalizedRank = (rankMidpoint / totalPlayers); // 0から1に正規化
                
                // ランクが低いほどレートが高いように逆転させる
                const estimatedRate = Math.round(maxOverallRate - (normalizedRank * rateRange));
                
                tierRateBounds[tier.name] = { min: estimatedRate, max: estimatedRate }; // まずは仮のmin/max
                prevRankLimit = upperRankLimit;
            }

            // 推定レートからtierRateBoundsを構築 (各Tierのmin/maxを確定)
            tierRateBounds['フロンティア マスター'].max = maxOverallRate; // マスターのmaxを最上位レートに設定
            for(let i = 0; i < TIER_DATA.length; i++) {
                const tierName = TIER_DATA[i].name;
                // 現在のTierの推定min
                const currentTierEstimatedMin = tierRateBounds[tierName].min;

                // 上のTierのminRateが現在のTierのmaxRateになる
                const maxRateForCurrentTier = (i === 0) ? maxOverallRate : tierRateBounds[TIER_DATA[i-1].name].min;
                
                tierRateBounds[tierName] = { 
                    min: currentTierEstimatedMin,
                    max: maxRateForCurrentTier
                };
            }
            // ブロンズ3の最低レートは0と仮定
            tierRateBounds['ブロンズ 3'].min = 0; 
            // ブロンズ3の最大レートはブロンズ2の最低レート
            tierRateBounds['ブロンズ 3'].max = tierRateBounds[TIER_DATA[TIER_DATA.length - 2].name].min;
        }

        // Tierと推定レート帯の目安をテーブルとして表示
        let tierEstimateHtml = `<p>（推定レートは、${allTierRatesEntered ? '入力された値' : '自動推定値'}に基づきます）</p><table><thead><tr><th>Tier</th><th>順位範囲</th><th>推定レート帯</th></tr></thead><tbody>`;
        let currentRankLower = 1;
        for(let i = 0; i < TIER_DATA.length; i++) {
            const tier = TIER_DATA[i];
            const rankUpper = tier.rankLimit; // 自動推定されたrankLimitを使用

            const estimatedMinRate = tierRateBounds[tier.name].min;
            const estimatedMaxRate = tierRateBounds[tier.name].max;

            tierEstimateHtml += `<tr><td>${tier.name}</td><td>${currentRankLower}位～${rankUpper}位</td><td>${estimatedMinRate}～${estimatedMaxRate}</td></tr>`;
            currentRankLower = rankUpper + 1;
        }
        tierEstimateHtml += `</tbody></table>`;
        tierRateEstimatesDiv.innerHTML = tierEstimateHtml;


        // 自分の現在のTierを特定
        let playerTierName = '';
        let playerTierMinRate = 0;
        let playerTierMaxRate = 0;

        for (const tierName in tierRateBounds) {
            // master_topは境界レートではなく最上位レートなので除外
            if (tierName.includes('_top')) continue;

            const min = Math.min(tierRateBounds[tierName].min, tierRateBounds[tierName].max);
            const max = Math.max(tierRateBounds[tierName].min, tierRateBounds[tierName].max);

            if (currentRate >= min && currentRate <= max) {
                playerTierName = tierName;
                playerTierMinRate = min;
                playerTierMaxRate = max;
                break;
            }
        }

        // もしTierが見つからない場合 (currentRateがTier範囲外の場合の考慮)
        if (!playerTierName) {
            const masterTierName = TIER_DATA[0].name;
            const bronze3TierName = TIER_DATA[TIER_DATA.length - 1].name;

            // 最上位Tierより高い場合
            if (currentRate >= tierRateBounds[masterTierName].max) { // >= に変更
                playerTierName = masterTierName;
                playerTierMinRate = tierRateBounds[masterTierName].min;
                playerTierMaxRate = tierRateBounds[masterTierName].max;
            } 
            // 最下位Tierより低い場合
            else if (currentRate <= tierRateBounds[bronze3TierName].min) { // <= に変更
                playerTierName = bronze3TierName;
                playerTierMinRate = tierRateBounds[bronze3TierName].min;
                playerTierMaxRate = tierRateBounds[bronze3TierName].max;
            } else {
                 // 通常このケースは発生しないはずだが、念のため一番近いTierに割り当てるなど対応
                 // ここでは仮にブロンズ3と仮定する
                 playerTierName = bronze3TierName;
                 playerTierMinRate = tierRateBounds[playerTierName].min;
                 playerTierMaxRate = tierRateBounds[playerTierName].max;
            }
        }

        // 自分の順位を推定 (Tier内で線形補間)
        let estimatedPlayerRank;
        if (playerTierName) {
            const currentTierData = TIER_DATA.find(t => t.name === playerTierName);
            const currentTierIndex = TIER_DATA.indexOf(currentTierData);
            
            const lowerRankLimitOfPrevTier = (currentTierIndex > 0) ? TIER_DATA[currentTierIndex - 1].rankLimit : 0;
            const upperRankLimitOfCurrentTier = currentTierData.rankLimit;
            const totalRanksInTier = upperRankLimitOfCurrentTier - lowerRankLimitOfPrevTier;
            
            if (playerTierMaxRate !== playerTierMinRate) {
                // レートが高いほど順位が高い (小さい) ので、逆比例させる
                // 例: 自分のレートがTierの最高レートに近ければ、Tier内の順位は良い (小さい)
                const normalizedRate = (currentRate - playerTierMinRate) / (playerTierMaxRate - playerTierMinRate);
                // 順位は逆順になるため、1から引く
                const relativeRankInTier = (1 - normalizedRate) * totalRanksInTier;
                estimatedPlayerRank = Math.round(lowerRankLimitOfPrevTier + relativeRankInTier);
            } else { 
                // レート範囲がない場合、Tierの中央または最低ランクに
                estimatedPlayerRank = Math.round(lowerRankLimitOfPrevTier + totalRanksInTier / 2);
            }
            estimatedPlayerRank = Math.max(1, Math.min(totalPlayers, estimatedPlayerRank));
        } else {
            // Tierが特定できない場合は、中間あたりの順位を仮定するか、エラーを出すか
            estimatedPlayerRank = Math.round(totalPlayers / 2); // とりあえず真ん中あたり
        }


        // 順位からレートを推定するヘルパー関数
        const getRateFromRank = (rank, totalPlayers, tierBounds) => {
            const masterTierName = TIER_DATA[0].name;
            const bronze3TierName = TIER_DATA[TIER_DATA.length - 1].name;

            // 各TierのrankLimitはすでにtotalPlayersで計算されていると仮定
            // rankが最も高いプレイヤー
            if (rank <= TIER_DATA[0].rankLimit && rank >= 1) return tierBounds[masterTierName].max; 
            // rankが最も低いプレイヤー
            if (rank > TIER_DATA[TIER_DATA.length - 1].rankLimit) return tierBounds[bronze3TierName].min;

            for (let i = 0; i < TIER_DATA.length; i++) {
                const tier = TIER_DATA[i];
                const lowerRankLimit = (i > 0 ? TIER_DATA[i-1].rankLimit : 0) + 1;
                const upperRankLimit = tier.rankLimit;

                if (rank >= lowerRankLimit && rank <= upperRankLimit) {
                    const tierMinRate = tierBounds[tier.name].min;
                    const tierMaxRate = tierBounds[tier.name].max;
                    
                    const rankInTier = rank - lowerRankLimit;
                    const totalRanksInTier = upperRankLimit - lowerRankLimit; 

                    if (totalRanksInTier <= 0) { // そのTierに1人しかいないか、範囲がない場合
                        return Math.round(tierMaxRate);
                    } else {
                        // ランクが小さいほどレートが高いので、逆比例
                        const estimatedRate = tierMaxRate - (tierMaxRate - tierMinRate) * (rankInTier / totalRanksInTier);
                        return Math.round(estimatedRate);
                    }
                }
            }
            return currentRate; // 見つからない場合は現在のレートを返す
        };

        // --- 対戦相手のレート選定と期待レート変動のシミュレーション ---
        const SIMULATION_MATCHES = 10000;
        let totalRateChangeSum = 0;

        for (let i = 0; i < SIMULATION_MATCHES; i++) {
            // 対戦相手の順位選定ロジックを修正: 自分の順位から上下30人の範囲
            let minOpponentRank = Math.max(1, estimatedPlayerRank - 30);
            let maxOpponentRank = Math.min(totalPlayers, estimatedPlayerRank + 30);

            // 1位と最下位の調整
            if (estimatedPlayerRank === 1) { // 1位の場合は1～31位
                maxOpponentRank = Math.min(totalPlayers, 31);
            } else if (estimatedPlayerRank === totalPlayers) { // 最下位の場合は (最下位-29)～最下位
                minOpponentRank = Math.max(1, totalPlayers - 29);
            }

            // minOpponentRank と maxOpponentRank の間のランダムな順位を選ぶ
            const opponentRank = Math.floor(Math.random() * (maxOpponentRank - minOpponentRank + 1)) + minOpponentRank;
            
            const opponentRate = getRateFromRank(opponentRank, totalPlayers, tierRateBounds);
            
            let opponentCategory;
            const rateDiff = currentRate - opponentRate; // 自分 - 相手
            // レート差によるカテゴリ分けの閾値 (前回と同じ、ユーザーの入力に合わせた表示のため)
            if (rateDiff >= 50) opponentCategory = 'muchLower'; // 相手がかなり低い
            else if (rateDiff >= 15) opponentCategory = 'slightlyLower'; // 相手がやや低い
            else if (rateDiff > -15) opponentCategory = 'equal'; // 相手が同等
            else if (rateDiff > -50) opponentCategory = 'slightlyHigher'; // 相手がやや高い
            else opponentCategory = 'muchHigher'; // 相手がかなり高い

            const winProbability = winRates[opponentCategory] / 100;
            const didWin = Math.random() < winProbability;

            let rateChange = 0;
            if (didWin) {
                // 勝利時: 16 + (相手のレート - 自分のレート) * 0.04
                rateChange = 16 + (opponentRate - currentRate) * rateDiffCoefficient;
                if (rateChange < 1) rateChange = 1; // 最低獲得レートは1
            } else {
                // 敗北時: (16 + (自分のレート - 相手のレート) * 0.04) * (全体の勝利数/全体の敗北数) * (-1)
                rateChange = (16 + (currentRate - opponentRate) * rateDiffCoefficient) * overallWinLossRatio * (-1.0);
                if (rateChange > -1) rateChange = -1; // 最低喪失レートは1 (マイナスなので-1)
            }
            totalRateChangeSum += rateChange;
        }

        const averageExpectedRateChangePerMatch = totalRateChangeSum / SIMULATION_MATCHES;
        const expectedRate100Matches = currentRate + (averageExpectedRateChangePerMatch * 100);

        // 目標レート達成までの必要試合数
        const targetRate = currentRate + targetRateIncrease;
        let neededMatches = '算出不可'; // 必要試合数に名称変更

        if (averageExpectedRateChangePerMatch > 0 && targetRateIncrease > 0) {
            neededMatches = Math.ceil(targetRateIncrease / averageExpectedRateChangePerMatch); 
        } else if (targetRateIncrease <= 0) {
            neededMatches = 0; // 目標レート増加量が0以下なら0試合で達成
        }

        // --- 3. 詳細なレート変動量の表示 (公式計算式に基づいて動的に計算) ---
        const detailedRateChanges = {};
        // レート差カテゴリの基準となる相手レートを設定（同等、かなり高い、など）
        const opponentRateAdjustments = {
            'muchHigher': 100, // 相手が自分より100高いと仮定
            'slightlyHigher': 30, // 相手が自分より30高いと仮定
            'equal': 0,          // 相手が自分と同等と仮定
            'slightlyLower': -30, // 相手が自分より30低いと仮定
            'muchLower': -100     // 相手が自分より100低いと仮定
        };

        for (const category in opponentRateAdjustments) {
            const simulatedOpponentRate = currentRate + opponentRateAdjustments[category];
            // レートが負にならないように0でクリップ
            const adjustedOpponentRate = Math.max(0, simulatedOpponentRate);

            let gain = 16 + (adjustedOpponentRate - currentRate) * rateDiffCoefficient;
            if (gain < 1) gain = 1;

            let loss = (16 + (currentRate - adjustedOpponentRate) * rateDiffCoefficient) * overallWinLossRatio * (-1.0);
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
        neededWinsForTargetDisplay.textContent = neededMatches;
    });
});
