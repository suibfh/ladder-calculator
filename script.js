document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const winsInput = document.getElementById('wins');
    const lossesInput = document.getElementById('losses');
    const currentRateInput = document.getElementById('currentRate');
    const targetRateIncreaseInput = document.getElementById('targetRateIncrease');
    const totalPlayersInput = document.getElementById('totalPlayers'); // ランクマッチの参加人数

    const tierRateBoundariesDiv = document.getElementById('tierRateBoundaries'); // Tier境界レート入力用div

    const winRateVsMuchHigherInput = document.getElementById('winRateVsMuchHigher'); // かなりレートが高い相手への勝率
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

    // --- 初期値設定 ---
    winsInput.value = 100;
    lossesInput.value = 70;
    currentRateInput.value = 2059;
    targetRateIncreaseInput.value = 200;
    totalPlayersInput.value = 250;

    winRateVsMuchHigherInput.value = 30;
    winRateVsSlightlyHigherInput.value = 50;
    winRateVsEqualInput.value = 70;
    winRateVsSlightlyLowerInput.value = 70;
    winRateVsMuchLowerInput.value = 80;

    // Tierデータ（Tier名と割合）
    const TIER_DATA = [
        // percentageは公式情報に基づき修正 (13.36% -> 13.30%)
        { name: 'フロンティア マスター', percentage: 0.1330 },
        { name: 'フロンティア ダイヤモンド', percentage: 0.1330 },
        { name: 'フロンティア プラチナ', percentage: 0.1330 },
        { name: 'ゴールド 1', percentage: 0.0833 },
        { name: 'ゴールド 2', percentage: 0.0833 },
        { name: 'ゴールド 3', percentage: 0.0833 },
        { name: 'シルバー 1', percentage: 0.0833 },
        { name: 'シルバー 2', percentage: 0.0833 },
        { name: 'シルバー 3', percentage: 0.0833 },
        { name: 'ブロンズ 1', percentage: 0.0833 },
        { name: 'ブロンズ 2', percentage: 0.0833 },
        { name: 'ブロンズ 3', percentage: 0.0833 }
    ];

    // Tier境界レートの初期値 (デバッグ用。Tierデータと一致させるため12個)
    const initialTierRates = {
        // 3500はフロンティアマスターの1位のレート、3062はフロンティアマスターの最低レート（かつフロンティアダイヤモンドの最高レート）
        'フロンティア マスター': 3062, // マスターの最低レート
        'フロンティア ダイヤモンド': 2733,
        'フロンティア プラチナ': 2628,
        'ゴールド 1': 2369,
        'ゴールド 2': 2181,
        'ゴールド 3': 2074,
        'シルバー 1': 1870,
        'シルバー 2': 1745,
        'シルバー 3': 1659,
        'ブロンズ 1': 1579,
        'ブロンズ 2': 1491, // 新たに追加された境界レート
        'ブロンズ 3': 1029
    };

    // --- 関数定義 ---
    // Tier境界レートの入力欄を動的に生成
    function generateTierRateInputs() {
        tierRateBoundariesDiv.innerHTML = ''; // 既存の入力欄をクリア

        TIER_DATA.forEach(tier => {
            const div = document.createElement('div');
            div.className = 'input-group-inline';
            div.innerHTML = `
                <label for="tierRate_${tier.name}">${tier.name} 最低レート:</label>
                <input type="number" id="tierRate_${tier.name}" value="" min="0">
            `;
            tierRateBoundariesDiv.appendChild(div);
            // 初期値を設定
            document.getElementById(`tierRate_${tier.name}`).value = initialTierRates[tier.name] !== undefined ? initialTierRates[tier.name] : '';
        });
        // フロンティアマスターの最高レート入力欄を別途追加（1位のレートとして）
        const fmMaxRateDiv = document.createElement('div');
        fmMaxRateDiv.className = 'input-group-inline';
        fmMaxRateDiv.innerHTML = `
            <label for="tierRate_フロンティア マスター_最高">フロンティア マスター (1位レート):</label>
            <input type="number" id="tierRate_フロンティア マスター_最高" value="3500" min="0">
        `;
        tierRateBoundariesDiv.insertBefore(fmMaxRateDiv, tierRateBoundariesDiv.firstChild); // 先頭に追加
    }

    // 計算実行関数
    function calculateLadderStats() {
        // --- 1. 入力値の取得 ---
        const wins = parseFloat(winsInput.value);
        const losses = parseFloat(lossesInput.value);
        const currentRate = parseFloat(currentRateInput.value);
        const targetRateIncrease = parseFloat(targetRateIncreaseInput.value);
        const totalPlayers = parseFloat(totalPlayersInput.value);

        const tierRateInputs = {};
        let allTierRatesFilled = true;

        // まずはフロンティアマスターの最高レートを取得
        const fmMaxRateInput = document.getElementById('tierRate_フロンティア マスター_最高');
        const fmMaxRate = parseFloat(fmMaxRateInput.value);
        if (isNaN(fmMaxRate)) {
            allTierRatesFilled = false;
        }
        tierRateInputs['フロンティア マスター_最高'] = fmMaxRate;


        TIER_DATA.forEach(tier => {
            const inputElement = document.getElementById(`tierRate_${tier.name}`);
            const rateValue = parseFloat(inputElement.value);
            if (isNaN(rateValue)) {
                allTierRatesFilled = false;
            }
            tierRateInputs[tier.name] = rateValue;
        });

        if (!allTierRatesFilled) {
            alert('Tierの境界レート設定はすべて入力必須です。');
            return; // 処理を中断
        }

        // 入力値の検証
        if (isNaN(wins) || isNaN(losses) || isNaN(currentRate) || isNaN(targetRateIncrease) || isNaN(totalPlayers) || totalPlayers <= 0) {
            alert('すべての入力項目に適切な数値を入力してください。');
            return;
        }
        
        // 勝率入力値のパースと格納
        const parsedWinRates = {
            muchHigher: parseFloat(winRateVsMuchHigherInput.value) / 100,
            slightlyHigher: parseFloat(winRateVsSlightlyHigherInput.value) / 100,
            equal: parseFloat(winRateVsEqualInput.value) / 100,
            slightlyLower: parseFloat(winRateVsSlightlyLowerInput.value) / 100,
            muchLower: parseFloat(winRateVsMuchLowerInput.value) / 100
        };


        // --- 新しいTier情報構造の構築とプレイヤー順位の特定 ---
        const combinedTierInfo = [];
        let currentRankCumulative = 0; // 各Tierの開始順位を計算するための累積
        let previousTierMinRate = tierRateInputs['フロンティア マスター_最高'] + 1; // 一つ前のTierの最低レート（初期値はFM最高レート+1）

        // 最上位Tier（フロンティアマスター）を最初に処理
        const fmTier = TIER_DATA.find(tier => tier.name === 'フロンティア マスター');
        if (fmTier) {
            const fmMaxRate = tierRateInputs['フロンティア マスター_最高'];
            const fmMinRate = tierRateInputs['フロンティア マスター'];
            const fmPlayerCount = Math.ceil(totalPlayers * fmTier.percentage);
            const fmStartRank = 1;
            const fmEndRank = fmPlayerCount;

            combinedTierInfo.push({
                name: fmTier.name,
                minRate: fmMinRate,
                maxRate: fmMaxRate,
                startRank: fmStartRank,
                endRank: fmEndRank,
                playerCount: fmPlayerCount
            });
            currentRankCumulative = fmEndRank; // 累積順位を更新
            previousTierMinRate = fmMinRate; // 次のTierの最高レートの基準
        }

        // その他のTierをレートの高い順に処理（TierDataはマスターからブロンズ3の順）
        // combinedTierInfo には逆順（レートの高い順）で追加していく
        for (let i = 0; i < TIER_DATA.length; i++) {
            const tier = TIER_DATA[i];
            if (tier.name === 'フロンティア マスター') continue; // マスターは既に処理済み

            const currentTierMinRate = tierRateInputs[tier.name];
            let currentTierMaxRate;

            // 次のTier（レートが高い側の隣接Tier）の最低レートから算出
            // TierDataはマスターが0番目、ダイヤモンドが1番目...と並んでいる
            const higherTierIndex = i - 1; // 自分のTierより一つ高いTierのインデックス
            if (higherTierIndex >= 0) {
                const higherTierName = TIER_DATA[higherTierIndex].name;
                currentTierMaxRate = tierRateInputs[higherTierName] - 1; // 上のTierの最低レート-1
            } else {
                // これはマスターより上のTierは存在しないため、通常到達しないはず
                currentTierMaxRate = previousTierMinRate - 1;
            }
            
            // ブロンズ3の最大レートはブロンズ2の最低レート-1
            // ブロンズ3の最低レートはtierRateInputs['ブロンズ 3']

            const tierPlayerCount = Math.ceil(totalPlayers * tier.percentage);
            const tierStartRank = currentRankCumulative + 1;
            const tierEndRank = currentRankCumulative + tierPlayerCount;

            combinedTierInfo.push({
                name: tier.name,
                minRate: currentTierMinRate,
                maxRate: currentTierMaxRate,
                startRank: tierStartRank,
                endRank: tierEndRank,
                playerCount: tierPlayerCount
            });
            currentRankCumulative = tierEndRank; // 累積順位を更新
        }

        // Tier外の情報を追加（ブロンズ3の最低レート未満）
        const bronze3MinRate = tierRateInputs['ブロンズ 3'];
        combinedTierInfo.push({
            name: 'Tier外',
            minRate: 0, // レート0から
            maxRate: bronze3MinRate - 1, // ブロンズ3の最低レート未満
            startRank: currentRankCumulative + 1,
            endRank: totalPlayers, // 総プレイヤー数まで
            playerCount: totalPlayers - currentRankCumulative
        });

        // combinedTierInfo をレートが高い順にソートしておく（今後の処理で便利）
        combinedTierInfo.sort((a, b) => b.minRate - a.minRate);


        // プレイヤーの現在の順位を推定する関数
        // rate: プレイヤーのレート
        function getEstimatedRankFromRate(rate) {
            if (rate > tierRateInputs['フロンティア マスター_最高']) return 1; // 1位より上は1位
            if (rate < tierRateInputs['ブロンズ 3']) return totalPlayers; // ブロンズ3より下は最下位付近

            for (const tier of combinedTierInfo) {
                if (rate >= tier.minRate && rate <= tier.maxRate) {
                    // Tier内のレート範囲における線形補間
                    if (tier.minRate === tier.maxRate) { // 境界値などでレート範囲が0の場合
                        return tier.startRank;
                    }
                    const rateRange = tier.maxRate - tier.minRate;
                    const rankRange = tier.endRank - tier.startRank;
                    const positionInTier = (rate - tier.minRate) / rateRange;
                    return Math.round(tier.startRank + (rankRange * positionInTier));
                }
            }
            return 1; // 見つからない場合は最高位とする（エラー回避）
        }

        // 順位範囲から平均レートを推定する関数
        // startRank, endRank: 順位範囲
        function getAverageRateFromRankRange(startRank, endRank) {
            // 順位範囲を丸める
            startRank = Math.max(1, Math.min(totalPlayers, Math.round(startRank)));
            endRank = Math.max(1, Math.min(totalPlayers, Math.round(endRank)));

            if (startRank > endRank) {
                [startRank, endRank] = [endRank, startRank]; // 逆転していたら入れ替え
            }
            if (startRank === endRank) { // 範囲が1の場合
                return getRateFromRank(startRank); // 単一順位のレートを返す
            }

            let totalRate = 0;
            let count = 0;

            // 範囲内の各Tierを考慮して平均レートを算出
            for (const tier of combinedTierInfo) {
                const overlapStartRank = Math.max(startRank, tier.startRank);
                const overlapEndRank = Math.min(endRank, tier.endRank);

                if (overlapStartRank <= overlapEndRank) {
                    // Tier内の平均レートを計算し、重複する順位数で重み付け
                    const tierAverageRate = (tier.minRate + tier.maxRate) / 2;
                    const numRanksInOverlap = overlapEndRank - overlapStartRank + 1;
                    totalRate += tierAverageRate * numRanksInOverlap;
                    count += numRanksInOverlap;
                }
            }
            return count > 0 ? totalRate / count : currentRate; // 計算できない場合は自分のレートを返す
        }

        // 自分の現在の順位を推定
        const currentRank = getEstimatedRankFromRate(currentRate);

        // 各カテゴリの対戦相手の順位範囲と想定レートを定義
        const opponentCategories = {
            muchHigher: { rankOffsetStart: -30, rankOffsetEnd: -21, display: 'かなり高い' },
            slightlyHigher: { rankOffsetStart: -20, rankOffsetEnd: -11, display: 'やや高い' },
            equal: { rankOffsetStart: -10, rankOffsetEnd: 10, display: '同等' },
            slightlyLower: { rankOffsetStart: 11, rankOffsetEnd: 20, display: 'やや低い' },
            muchLower: { rankOffsetStart: 21, rankOffsetEnd: 30, display: 'かなり低い' }
        };

        let totalExpectedRateChangePerMatch = 0;
        const detailedRateChanges = {};

        for (const categoryKey in opponentCategories) {
            const categoryInfo = opponentCategories[categoryKey];
            
            // 相手の順位範囲を計算 (1位〜総プレイヤー数に収める)
            const opponentRankStart = Math.max(1, currentRank + categoryInfo.rankOffsetStart);
            const opponentRankEnd = Math.min(totalPlayers, currentRank + categoryInfo.rankOffsetEnd);

            // この順位範囲の平均レートを相手レートとする
            const opponentRate = getAverageRateFromRankRange(opponentRankStart, opponentRankEnd);

            const winRate = parsedWinRates[categoryKey];

            // レート計算式: 16 + (相手のレート - 自分のレート) * 0.04
            let gain = 16 + (opponentRate - currentRate) * 0.04; // 勝利時
            if (gain < 1) gain = 1; // 最低増加量を1とする

            // 敗北時計算式: -(16 + (自分のレート - 相手のレート) * 0.04) * ランクマッチ全体の勝利数/ランクマッチ全体の敗北数
            let loss = -(16 + (currentRate - opponentRate) * 0.04) * 1.0; 
            if (loss > -1) loss = -1; // 最低減少量を-1とする
            
            detailedRateChanges[categoryKey] = { gain: gain.toFixed(1), loss: loss.toFixed(1) };

            // 期待レート変化量の計算
            totalExpectedRateChangePerMatch += (gain * winRate) + (loss * (1 - winRate));
        }

        // --- 2. 基本的な計算 ---
        const totalMatches = wins + losses;
        const currentWinRate = (wins / totalMatches) * 100;

        const expectedRate100Matches = currentRate + (totalExpectedRateChangePerMatch * 100);

        // 目標レート達成までの必要勝利数
        const targetRate = currentRate + targetRateIncrease;
        let neededWinsForTarget = 0;
        if (totalExpectedRateChangePerMatch > 0) {
            neededWinsForTarget = Math.ceil(targetRateIncrease / totalExpectedRateChangePerMatch);
        } else {
            neededWinsForTarget = 'レート増加は難しいかもしれません';
        }

        // --- 4. 詳細レート変動量テーブルの表示 ---
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


        // --- 5. 結果の表示 ---
        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        neededWinsForTargetDisplay.textContent = neededWinsForTarget;

        // --- 6. Tierと推定レート帯の目安の表示 ---
        const tierRateTableBody = document.querySelector('#tierRateTable tbody');
        tierRateTableBody.innerHTML = ''; // 既存の行をクリア
        
        // combinedTierInfo を使ってテーブル表示
        // Tier外は最後に表示するため、一旦combinedTierInfoから除外してソート
        const tiersForDisplay = combinedTierInfo.filter(tier => tier.name !== 'Tier外');
        tiersForDisplay.sort((a, b) => b.minRate - a.minRate); // レートの高い順にソート

        tiersForDisplay.forEach(tier => {
            const row = tierRateTableBody.insertRow();
            row.insertCell().textContent = tier.name;
            let rateRangeText;
            if (tier.name === 'フロンティア マスター') {
                rateRangeText = `${tier.minRate} 〜 ${tier.maxRate}`;
            } else if (tier.name === 'ブロンズ 3') {
                 // ブロンズ3の表示は特殊 (最高レートは一つ上のTierの最低レート-1)
                const bronze2MinRate = tierRateInputs['ブロンズ 2'];
                rateRangeText = `${tier.minRate} 〜 ${bronze2MinRate -1}`;
            } else {
                rateRangeText = `${tier.minRate} 〜 ${tier.maxRate}`;
            }
            row.insertCell().textContent = rateRangeText;
            row.insertCell().textContent = `${tier.startRank} 〜 ${tier.endRank}`;
        });

        // Tier外の表示
        const outOfTier = combinedTierInfo.find(tier => tier.name === 'Tier外');
        if (outOfTier) {
            const row = tierRateTableBody.insertRow();
            row.insertCell().textContent = outOfTier.name;
            row.insertCell().textContent = `${outOfTier.minRate} 〜 ${outOfTier.maxRate}`;
            row.insertCell().textContent = `${outOfTier.startRank} 〜 ${outOfTier.endRank}`;
        }
    }

    // ページロード時にTier境界レート入力欄を生成
    generateTierRateInputs();

    // ページロード時に計算を実行して初期表示
    calculateLadderStats();

    // 入力値変更時に再計算
    winsInput.addEventListener('input', calculateLadderStats);
    lossesInput.addEventListener('input', calculateLadderStats);
    currentRateInput.addEventListener('input', calculateLadderStats);
    targetRateIncreaseInput.addEventListener('input', calculateLadderStats);
    totalPlayersInput.addEventListener('input', calculateLadderStats);
    winRateVsMuchHigherInput.addEventListener('input', calculateLadderStats);
    winRateVsSlightlyHigherInput.addEventListener('input', calculateLadderStats);
    winRateVsEqualInput.addEventListener('input', calculateLadderStats);
    winRateVsSlightlyLowerInput.addEventListener('input', calculateLadderStats);
    winRateVsMuchLowerInput.addEventListener('input', calculateLadderStats);
    tierRateBoundariesDiv.addEventListener('input', calculateLadderStats); // Tier境界レート入力の変更を監視

});
