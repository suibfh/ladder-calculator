document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const winsInput = document.getElementById('wins');
    const lossesInput = document.getElementById('losses');
    const currentRateInput = document.getElementById('currentRate');
    const targetRateIncreaseInput = document.getElementById('targetRateIncrease');

    const rateGainVsMuchHigherInput = document.getElementById('rateGainVsMuchHigher');
    const rateLossVsMuchHigherInput = document.getElementById('rateLossVsMuchHigher');
    const rateGainVsMuchLowerInput = document.getElementById('rateGainVsMuchLower');
    const rateLossVsMuchLowerInput = document.getElementById('rateLossVsMuchLower');

    const winRateVsMuchHigherInput = document.getElementById('winRateVsMuchHigher');
    const winRateVsSlightlyHigherInput = document.getElementById('winRateVsSlightlyHigher');
    const winRateVsEqualInput = document.getElementById('winRateVsEqual');
    const winRateVsSlightlyLowerInput = document.getElementById('winRateVsSlightlyLower');
    const winRateVsMuchLowerInput = document.getElementById('winRateVsMuchLower');

    const calculateButton = document.getElementById('calculateButton');

    // 出力表示要素
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

    // 計算実行関数
    calculateButton.addEventListener('click', () => {
        // --- 1. 入力値の取得とバリデーション ---
        const wins = parseInt(winsInput.value) || 0;
        const losses = parseInt(lossesInput.value) || 0;
        const currentRate = parseFloat(currentRateInput.value);
        const targetRateIncrease = parseFloat(targetRateIncreaseInput.value) || 0;

        const rateGainVsMuchHigher = parseFloat(rateGainVsMuchHigherInput.value) || 0;
        const rateLossVsMuchHigher = parseFloat(rateLossVsMuchHigherInput.value) || 0;
        const rateGainVsMuchLower = parseFloat(rateGainVsMuchLowerInput.value) || 0;
        const rateLossVsMuchLower = parseFloat(rateLossVsMuchLowerInput.value) || 0;

        const winRateVsMuchHigher = parseFloat(winRateVsMuchHigherInput.value);
        const winRateVsSlightlyHigher = parseFloat(winRateVsSlightlyHigherInput.value);
        const winRateVsEqual = parseFloat(winRateVsEqualInput.value);
        const winRateVsSlightlyLower = parseFloat(winRateVsSlightlyLowerInput.value);
        const winRateVsMuchLower = parseFloat(winRateVsMuchLowerInput.value);

        // 必須入力項目のチェック
        if (isNaN(currentRate)) {
            alert('現在のレートを入力してください。');
            currentRateInput.focus();
            return;
        }
        if (isNaN(winRateVsMuchHigher) || isNaN(winRateVsSlightlyHigher) || isNaN(winRateVsEqual) || isNaN(winRateVsSlightlyLower) || isNaN(winRateVsMuchLower)) {
            alert('対戦相手ランク帯別の勝利割合をすべて入力してください。');
            return;
        }
        if (wins + losses === 0) { // 負け数を入力させるようにしたので、総試合数が0の場合は勝率計算できない
             alert('勝ち数か負け数のどちらか、または両方を入力してください。');
             winsInput.focus();
             return;
        }


        // --- 2. 各種計算処理 ---

        // 総試合数と現在の勝率
        const totalMatches = wins + losses;
        const currentWinRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

        // 詳細なレート変動量の算出 (線形補間)
        // 相手ランクの相対値を数値化: かなり上(2), やや上(1), 同等(0), やや下(-1), かなり下(-2)
        const getInterpolatedRateChange = (baseVal1, basePoint1, baseVal2, basePoint2, targetPoint) => {
            if (basePoint1 === basePoint2) return baseVal1; // 0除算回避
            return baseVal1 + (baseVal2 - baseVal1) * (targetPoint - basePoint1) / (basePoint2 - basePoint1);
        };

        // 勝利時のレート増減
        const gainSlightlyHigher = getInterpolatedRateChange(rateGainVsMuchHigher, 2, rateGainVsMuchLower, -2, 1);
        const gainEqual = getInterpolatedRateChange(rateGainVsMuchHigher, 2, rateGainVsMuchLower, -2, 0);
        const gainSlightlyLower = getInterpolatedRateChange(rateGainVsMuchHigher, 2, rateGainVsMuchLower, -2, -1);

        // 敗北時のレート増減
        const lossSlightlyHigher = getInterpolatedRateChange(rateLossVsMuchHigher, 2, rateLossVsMuchLower, -2, 1);
        const lossEqual = getInterpolatedRateChange(rateLossVsMuchHigher, 2, rateLossVsMuchLower, -2, 0);
        const lossSlightlyLower = getInterpolatedRateChange(rateLossVsMuchHigher, 2, rateLossVsMuchLower, -2, -1);

        // 100戦後のレート期待値
        const numSimulations = 10000; // シミュレーション回数を増やして精度を上げる
        let totalExpectedRateChange = 0;

        // 各ランク帯での1試合あたりの期待レート変動を計算
        // (勝利時の変動量 * 勝利割合) + (敗北時の変動量 * 敗北割合)
        const expectedChangePerMatch = {
            'muchHigher': (rateGainVsMuchHigher * (winRateVsMuchHigher / 100)) + (rateLossVsMuchHigher * (1 - (winRateVsMuchHigher / 100))),
            'slightlyHigher': (gainSlightlyHigher * (winRateVsSlightlyHigher / 100)) + (lossSlightlyHigher * (1 - (winRateVsSlightlyHigher / 100))),
            'equal': (gainEqual * (winRateVsEqual / 100)) + (lossEqual * (1 - (winRateVsEqual / 100))),
            'slightlyLower': (gainSlightlyLower * (winRateVsSlightlyLower / 100)) + (lossSlightlyLower * (1 - (winRateVsSlightlyLower / 100))),
            'muchLower': (rateGainVsMuchLower * (winRateVsMuchLower / 100)) + (rateLossVsMuchLower * (1 - (winRateVsMuchLower / 100)))
        };

        // 各ランク帯との対戦頻度（仮定） - ここは現状不明なため、均等と仮定
        // あるいは、もう少しユーザーに優しい入力方法を検討することも可能
        // 例：それぞれのランク帯との対戦頻度をパーセンテージで入力させる、など
        // 今回はシンプルに、各ランク帯との対戦が均等に発生すると仮定して進めます。
        const averageExpectedChangePerMatch = (
            expectedChangePerMatch.muchHigher +
            expectedChangePerMatch.slightlyHigher +
            expectedChangePerMatch.equal +
            expectedChangePerMatch.slightlyLower +
            expectedChangePerMatch.muchLower
        ) / 5; // 5つのランク帯で割る

        const expectedRate100Matches = currentRate + (averageExpectedChangePerMatch * 100);


        // 目標レート達成までの必要勝利数
        const targetRate = currentRate + targetRateIncrease;
        let neededWins = '算出不可'; // 初期値を設定

        if (averageExpectedChangePerMatch > 0) { // 期待値がプラスの場合のみ算出可能
            neededWins = Math.ceil(targetRateIncrease / averageExpectedChangePerMatch);
            if (neededWins < 0) neededWins = 0; // マイナスになった場合は0とする
        }


        // --- 3. 結果の表示 ---

        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        neededWinsForTargetDisplay.textContent = neededWins;

        // 詳細なレート変動量をテーブルに表示
        gainMuchHigherCalculated.textContent = `+${rateGainVsMuchHigher}`;
        lossMuchHigherCalculated.textContent = `-${Math.abs(rateLossVsMuchHigher)}`;
        gainSlightlyHigherCalculated.textContent = `+${gainSlightlyHigher.toFixed(0)}`;
        lossSlightlyHigherCalculated.textContent = `-${Math.abs(lossSlightlyHigher.toFixed(0))}`;
        gainEqualCalculated.textContent = `+${gainEqual.toFixed(0)}`;
        lossEqualCalculated.textContent = `-${Math.abs(lossEqual.toFixed(0))}`;
        gainSlightlyLowerCalculated.textContent = `+${gainSlightlyLower.toFixed(0)}`;
        lossSlightlyLowerCalculated.textContent = `-${Math.abs(lossSlightlyLower.toFixed(0))}`;
        gainMuchLowerCalculated.textContent = `+${rateGainVsMuchLower}`;
        lossMuchLowerCalculated.textContent = `-${Math.abs(rateLossVsMuchLower)}`;
    });
});
