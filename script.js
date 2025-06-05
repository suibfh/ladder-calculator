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
    const lossSlightallyLowerCalculated = document.getElementById('lossSlightallyLowerCalculated'); // 誤字修正必要 lossSlightlyLowerCalculated
    const gainMuchLowerCalculated = document.getElementById('gainMuchLowerCalculated');
    const lossMuchLowerCalculated = document.getElementById('lossMuchLowerCalculated');

    // Tierと推定レート帯の目安テーブル要素
    const tierRateTableBody = document.querySelector('#tierRateTable tbody');

    // --- Tierデータ構造 ---
    // percentageは公式から提供された概算値を使用
    // ブロンズのpercentageは計算ロジック内で動的に割り振るため、ここでは0とする
    const TIER_DATA = [
        { name: 'フロンティア マスター', percentage: 0.01 },     // 1%
        { name: 'フロンティア ダイヤモンド', percentage: 0.04 },  // 4%
        { name: 'フロンティア プラチナ', percentage: 0.05 },     // 5%
        { name: 'ゴールド 1', percentage: 0.0667 },             // 6.67%
        { name: 'ゴールド 2', percentage: 0.0667 },             // 6.67%
        { name: 'ゴールド 3', percentage: 0.0667 },             // 6.67%
        { name: 'シルバー 1', percentage: 0.10 },               // 10%
        { name: 'シルバー 2', percentage: 0.10 },               // 10%
        { name: 'シルバー 3', percentage: 0.10 },               // 10%
        { name: 'ブロンズ 1', percentage: 0 },                  // dynamically calculated
        { name: 'ブロンズ 2', percentage: 0 },                  // dynamically calculated
        { name: 'ブロンズ 3', percentage: 0 }                   // dynamically calculated (absorbs remainder)
    ];

    // --- Tier境界レートの初期設定と動的生成 ---
    // ここではTier境界レートのデフォルト値と入力要素を紐付ける
    const tierRateInputs = {}; // Tier名 -> 境界レート入力要素のIDまたは値

    const defaultTierRates = {
        'フロンティア マスター': 3500,
        'フロンティア ダイヤモンド': 3062,
        'フロンティア プラチナ': 2625,
        'ゴールド 1': 2187,
        'ゴールド 2': 1750,
        'ゴールド 3': 1312,
        'シルバー 1': 875,
        'シルバー 2': 656,
        'シルバー 3': 437,
        'ブロンズ 1': 218,
        'ブロンズ 2': 109,
        'ブロンズ 3': 0 // 最下位Tierの下限は0と仮定
    };

    // Tier境界レート入力欄を動的に生成
    TIER_DATA.forEach((tier, index) => {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group tier-rate-input';

        const label = document.createElement('label');
        label.setAttribute('for', `tierRate-${tier.name.replace(/\s/g, '')}`);
        label.textContent = `${tier.name} 最低レート:`;
        inputGroup.appendChild(label);

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `tierRate-${tier.name.replace(/\s/g, '')}`;
        input.value = defaultTierRates[tier.name] !== undefined ? defaultTierRates[tier.name] : '';
        input.min = "0";
        input.placeholder = `例: ${defaultTierRates[tier.name]}`;
        inputGroup.appendChild(input);

        tierRateBoundariesDiv.appendChild(inputGroup);
        tierRateInputs[tier.name] = input; // 入力要素を保持
    });


    // --- 計算実行関数 ---
    function calculateLadderStats() {
        // --- 1. 入力値の取得とバリデーション ---
        const wins = parseInt(winsInput.value) || 0;
        const losses = parseInt(lossesInput.value) || 0;
        const currentRate = parseFloat(currentRateInput.value);
        const targetRateIncrease = parseFloat(targetRateIncreaseInput.value) || 0;
        const totalPlayers = parseInt(totalPlayersInput.value); // ランクマッチの参加人数

        // Tier境界レートを更新（ユーザー入力値があればそれを優先）
        const currentTierRates = {};
        for (const tierName in tierRateInputs) {
            const inputElement = tierRateInputs[tierName];
            const rate = parseFloat(inputElement.value);
            currentTierRates[tierName] = isNaN(rate) ? defaultTierRates[tierName] : rate;
        }

        const winRateVs = {
            muchHigher: parseFloat(winRateVsMuchHigherInput.value) / 100 || 0.5,
            slightlyHigher: parseFloat(winRateVsSlightlyHigherInput.value) / 100 || 0.5,
            equal: parseFloat(winRateVsEqualInput.value) / 100 || 0.5,
            slightlyLower: parseFloat(winRateVsSlightlyLowerInput.value) / 100 || 0.5,
            muchLower: parseFloat(winRateVsMuchLowerInput.value) / 100 || 0.5
        };

        // 必須入力のバリデーション
        if (isNaN(currentRate) || currentRate < 0) {
            alert('現在のレートを正しく入力してください。');
            currentRateInput.focus();
            return;
        }
        if (isNaN(totalPlayers) || totalPlayers <= 0) {
            alert('ランクマッチの参加人数を正しく入力してください（1以上の数値）。');
            totalPlayersInput.focus();
            return;
        }

        const totalMatches = wins + losses;
        const currentWinRate = totalMatches === 0 ? 0 : (wins / totalMatches) * 100;

        // --- 2. レート変動量の計算 ---
        // 基本レート変動量 (仮の計算ロジック)
        const baseRateChangePerWin = 30; // 暫定値、ゲームによる
        const baseRateChangePerLoss = -20; // 暫定値、ゲームによる

        // 目標レート
        const targetRate = currentRate + targetRateIncrease;

        // 相手レート差による補正 (仮の計算ロジック)
        const rateDiffFactor = {
            muchHigher: 1.5,    // かなり高い相手には多く増減
            slightlyHigher: 1.2, // やや高い相手には多く増減
            equal: 1.0,         // 同等
            slightlyLower: 0.8, // やや低い相手には少なく増減
            muchLower: 0.5      // かなり低い相手には少なく増減
        };

        const detailedRateChanges = {};
        for (const category in rateDiffFactor) {
            const factor = rateDiffFactor[category];
            const gain = baseRateChangePerWin * factor;
            let loss = baseRateChangePerLoss * factor;

            // 敗北時のレート減少は最低-1を保証する（例：-0.5 なら -1 とする）
            // Math.ceil を使って、小数点以下を切り上げて絶対値を大きくする
            // lossが負の値なので、Math.ceil を使うと0に近づく。
            // desired: -0.5 -> -1, -1.2 -> -2. So, ceil(abs(loss)) * -1
            loss = Math.ceil(Math.abs(loss)) * -1; // 例: -1.2 -> -2, -0.5 -> -1

            detailedRateChanges[category] = { gain: gain, loss: loss };
        }

        // --- 3. 100戦後のレート期待値と必要勝利数の計算 ---
        let expectedRate100Matches = currentRate;
        for (const category in winRateVs) {
            const winProb = winRateVs[category];
            const lossProb = 1 - winProb;
            const avgRateChangePerMatch = (detailedRateChanges[category].gain * winProb) + (detailedRateChanges[category].loss * lossProb);
            expectedRate100Matches += (avgRateChangePerMatch * 100) / Object.keys(winRateVs).length; // 各カテゴリが均等に発生すると仮定
        }

        // 目標レート達成までの必要勝利数 (簡略化された計算)
        // 平均的なレート変動量を仮定
        const avgExpectedRateChangePerMatch = expectedRate100Matches > currentRate ?
            (expectedRate100Matches - currentRate) / 100 : // 期待値が上がる場合
            (detailedRateChanges.equal.gain * winRateVs.equal + detailedRateChanges.equal.loss * (1 - winRateVs.equal)); // 期待値が上がらない場合、同等相手での変動で計算

        let neededWinsForTarget = '計算不能';
        if (targetRateIncrease > 0 && avgExpectedRateChangePerMatch > 0) {
            neededWinsForTarget = Math.ceil(targetRateIncrease / avgExpectedRateChangePerMatch);
        } else if (targetRateIncrease <= 0) {
            neededWinsForTarget = 0; // 目標増加量が0以下なら0勝
        }
        neededWinsForTargetDisplay.textContent = neededWinsForTarget;


        // --- 4. Tierと推定レート帯の目安の計算 ---
        const combinedTierInfo = [];
        let currentRankCumulative = 0;
        let sumOfAllocatedPlayers = 0;

        // TierDataのインデックスを名前で取得
        const silver3Index = TIER_DATA.findIndex(tier => tier.name === 'シルバー 3');
        const bronze1Index = TIER_DATA.findIndex(tier => tier.name === 'ブロンズ 1');
        const bronze2Index = TIER_DATA.findIndex(tier => tier.name === 'ブロンズ 2');
        const bronze3Index = TIER_DATA.findIndex(tier => tier.name === 'ブロンズ 3');


        // マスターからシルバー3までのTierを処理
        for (let i = 0; i <= silver3Index; i++) {
            const tier = TIER_DATA[i];

            // percentageはTIER_DATAに直接設定されている値を使用
            let tierPlayerCount = Math.floor(totalPlayers * tier.percentage);
            tierPlayerCount = Math.max(1, tierPlayerCount); // 最低1人は保証

            const tierStartRank = currentRankCumulative + 1;
            const tierEndRank = Math.min(totalPlayers, currentRankCumulative + tierPlayerCount);

            combinedTierInfo.push({
                name: tier.name,
                // minRate, maxRateはTier境界レート入力値から設定
                minRate: currentTierRates[tier.name],
                maxRate: currentTierRates[tier.name] === currentTierRates['フロンティア マスター'] ? '上限なし' : currentTierRates[TIER_DATA[i-1].name] - 1, // マスターは上限なし
                startRank: tierStartRank,
                endRank: tierEndRank,
                playerCount: tierPlayerCount
            });
            currentRankCumulative = tierEndRank;
            sumOfAllocatedPlayers += tierPlayerCount;
        }

        // ブロンズTierの処理 (残り人数を均等割り振り、端数をブロンズ3へ)
        let remainingPlayersForBronze = totalPlayers - sumOfAllocatedPlayers;

        // 残り人数が0以下になった場合、これ以降のTierは0人とする
        if (remainingPlayersForBronze <= 0) {
            // ブロンズ1,2,3を0人で追加
            [bronze1Index, bronze2Index, bronze3Index].forEach(idx => {
                const tier = TIER_DATA[idx];
                combinedTierInfo.push({
                    name: tier.name,
                    minRate: currentTierRates[tier.name],
                    maxRate: currentTierRates[tier.name] === currentTierRates['ブロンズ 3'] ? '下限なし' : currentTierRates[TIER_DATA[idx-1].name] - 1,
                    startRank: currentRankCumulative + 1,
                    endRank: currentRankCumulative, // 0人なので開始順位と終了順位は同じ
                    playerCount: 0
                });
            });
        } else {
            // 残り人数を3で割る
            const baseBronzePlayerCount = Math.floor(remainingPlayersForBronze / 3);
            const remainderForBronze3 = remainingPlayersForBronze % 3;

            // ブロンズ1
            let bronze1PlayerCount = Math.max(1, baseBronzePlayerCount); // 最低1人は保証
            // ただし、残り人数が3未満でかつMath.floor(remainingPlayersForBronze / 3)が0になる場合、残り全員をブロンズ3に持っていくため、ブロンズ1,2は0になる可能性がある
            if (remainingPlayersForBronze < 3 && baseBronzePlayerCount === 0) { // 例: 残り1人ならブロンズ3が1人
                 bronze1PlayerCount = 0;
            }

            // ブロンズ2
            let bronze2PlayerCount = Math.max(1, baseBronzePlayerCount); // 最低1人は保証
             if (remainingPlayersForBronze < 3 && baseBronzePlayerCount === 0) {
                 bronze2PlayerCount = 0;
            }


            // ブロンズ3 (余りを吸収)
            let bronze3PlayerCount = remainingPlayersForBronze - bronze1PlayerCount - bronze2PlayerCount;
            // ブロンズ3は残りを全て吸収するため、Math.max(1, ...)は不要だが、totalPlayersが極端に少ない場合の考慮は必要
            if (bronze3PlayerCount <= 0 && remainingPlayersForBronze > 0) { // 残り人数があるのに割り振りが0以下になったら、全てブロンズ3へ
                bronze3PlayerCount = remainingPlayersForBronze;
                bronze1PlayerCount = 0; // すべてブロンズ3に回すため、他のブロンズは0人
                bronze2PlayerCount = 0;
            }
             bronze3PlayerCount = Math.max(1, bronze3PlayerCount); // 念の為、最低1人を保証

            // ブロンズ1の追加
            const bronze1Tier = TIER_DATA[bronze1Index];
            combinedTierInfo.push({
                name: bronze1Tier.name,
                minRate: currentTierRates[bronze1Tier.name],
                maxRate: currentTierRates[TIER_DATA[bronze1Index-1].name] - 1,
                startRank: currentRankCumulative + 1,
                endRank: Math.min(totalPlayers, currentRankCumulative + bronze1PlayerCount),
                playerCount: bronze1PlayerCount
            });
            currentRankCumulative += bronze1PlayerCount;
            sumOfAllocatedPlayers += bronze1PlayerCount;


            // ブロンズ2の追加
            const bronze2Tier = TIER_DATA[bron2Index]; // 誤字修正必要 bronze2Index
            combinedTierInfo.push({
                name: bronze2Tier.name,
                minRate: currentTierRates[bronze2Tier.name],
                maxRate: currentTierRates[TIER_DATA[bronze2Index-1].name] - 1,
                startRank: currentRankCumulative + 1,
                endRank: Math.min(totalPlayers, currentRankCumulative + bronze2PlayerCount),
                playerCount: bronze2PlayerCount
            });
            currentRankCumulative += bronze2PlayerCount;
            sumOfAllocatedPlayers += bronze2PlayerCount;

            // ブロンズ3の追加
            const bronze3Tier = TIER_DATA[bronze3Index];
            combinedTierInfo.push({
                name: bronze3Tier.name,
                minRate: currentTierRates[bronze3Tier.name],
                maxRate: '下限なし', // ブロンズ3は下限なし
                startRank: currentRankCumulative + 1,
                endRank: totalPlayers, // ブロンズ3は常に最後のプレイヤーまで
                playerCount: bronze3PlayerCount
            });
            currentRankCumulative = totalPlayers;
            sumOfAllocatedPlayers += bronze3PlayerCount;
        }

        // --- Tierと推定レート帯の目安の表示 ---
        tierRateTableBody.innerHTML = ''; // テーブルをクリア

        combinedTierInfo.forEach(tier => {
            const row = tierRateTableBody.insertRow();
            const rankCell = row.insertCell();
            const rateCell = row.insertCell();
            const playerCountCell = row.insertCell(); // 人数表示セルを追加

            const endRankText = tier.endRank === totalPlayers ? totalPlayers : tier.endRank; // 最後のTierは総人数まで
            rankCell.textContent = `${tier.startRank}位 ~ ${endRankText}位`;

            const maxRateText = typeof tier.maxRate === 'string' ? tier.maxRate : Math.round(tier.maxRate);
            const minRateText = typeof tier.minRate === 'string' ? tier.minRate : Math.round(tier.minRate); // ブロンズ3の下限も考慮

            if (tier.name === 'フロンティア マスター') {
                rateCell.textContent = `${minRateText} ~ ${maxRateText}`; // 例: 3500 ~ 上限なし
            } else if (tier.name === 'ブロンズ 3') {
                 rateCell.textContent = `${minRateText} ~ ${maxRateText}`; // 例: 0 ~ 下限なし
            }
             else {
                rateCell.textContent = `${minRateText} ~ ${maxRateText}`; // 例: 3062 ~ 3499
            }
            playerCountCell.textContent = `${tier.playerCount}人`; // 人数を表示
        });


        // --- 4. 結果の表示 ---
        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        // neededWinsForTargetDisplay は上記で設定済み

        // 詳細レート変動量テーブルの表示
        gainMuchHigherCalculated.textContent = `+${detailedRateChanges.muchHigher.gain.toFixed(1)}`;
        lossMuchHigherCalculated.textContent = `${detailedRateChanges.muchHigher.loss.toFixed(1)}`;
        gainSlightlyHigherCalculated.textContent = `+${detailedRateChanges.slightlyHigher.gain.toFixed(1)}`;
        lossSlightlyHigherCalculated.textContent = `${detailedRateChanges.slightlyHigher.loss.toFixed(1)}`;
        gainEqualCalculated.textContent = `+${detailedRateChanges.equal.gain.toFixed(1)}`;
        lossEqualCalculated.textContent = `${detailedRateChanges.equal.loss.toFixed(1)}`;
        gainSlightlyLowerCalculated.textContent = `+${detailedRateChanges.slightlyLower.gain.toFixed(1)}`;
        lossSlightallyLowerCalculated.textContent = `${detailedRateChanges.slightlyLower.loss.toFixed(1)}`; // 誤字修正
        gainMuchLowerCalculated.textContent = `+${detailedRateChanges.muchLower.gain.toFixed(1)}`;
        lossMuchLowerCalculated.textContent = `${detailedRateChanges.muchLower.loss.toFixed(1)}`;

        // エラー修正: lossSlightallyLowerCalculated が正しくないため修正
        document.getElementById('lossSlightlyLowerCalculated').textContent = `${detailedRateChanges.slightlyLower.loss.toFixed(1)}`;

    }

    // --- イベントリスナーの設定 ---
    // すべての入力フィールドで変更があったら計算を実行
    [
        winsInput, lossesInput, currentRateInput, targetRateIncreaseInput, totalPlayersInput,
        winRateVsMuchHigherInput, winRateVsSlightlyHigherInput, winRateVsEqualInput,
        winRateVsSlightlyLowerInput, winRateVsMuchLowerInput
    ].forEach(input => {
        input.addEventListener('input', calculateLadderStats);
    });

    // Tier境界レートの入力フィールドにもイベントリスナーを設定
    for (const tierName in tierRateInputs) {
        tierRateInputs[tierName].addEventListener('input', calculateLadderStats);
    }

    calculateButton.addEventListener('click', calculateLadderStats);

    // 初期表示のために一度計算を実行
    calculateLadderStats();
});
