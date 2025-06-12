const CYCLE_DELAY = 800; // Not used in current logic, but was in original template

document.addEventListener('DOMContentLoaded', () => {
    fetch('/𐍈')
      .then(r => {
        if (r.ok) {
          document.getElementById('protectedContent').style.display = 'block';
        } else {
          document.body.innerHTML = '';
        }
      })
      .catch(() => {
        document.body.innerHTML = '';
      });
});

const CYCLE_CONSONANT = {
    'ㄱ': ['ㄱ', 'ㅋ', 'ㄲ'],
    'ㄴ': ['ㄴ', 'ㄹ'],
    'ㄷ': ['ㄷ', 'ㅌ', 'ㄸ'],
    'ㅂ': ['ㅂ', 'ㅍ', 'ㅃ'],
    'ㅅ': ['ㅅ', 'ㅎ', 'ㅆ'],
    'ㅈ': ['ㅈ', 'ㅊ', 'ㅉ'],
    'ㅇ': ['ㅇ', 'ㅁ'] // 'ㅇ'과 'ㅁ' 순환 그룹 유지 (천지인)
};
const REVERSE_CYCLE_MAP = {};
for (const base in CYCLE_CONSONANT) {
    CYCLE_CONSONANT[base].forEach(variant => {
        REVERSE_CYCLE_MAP[variant] = base
    })
}

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = "\0ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"; // 순환 자음을 포함

// 여기는 COMPOSE_JUNG (모음 조합)
const COMPOSE_JUNG = {
    'ㅣㆍ': 'ㅏ',
    'ㆍㅣ': 'ㅓ',
    'ㆍㅡ': 'ㅗ',
    'ㅡㆍ': 'ㅜ',
    'ㅡㅣ': 'ㅢ',
    'ㅏㆍ': 'ㅑ',
    'ㅓㆍ': 'ㅕ',
    'ㅗㆍ': 'ㅛ',
    'ㅜㆍ': 'ㅠ',
    'ㅏㅣ': 'ㅐ',
    'ㅐㅣ': 'ㅒ',
    'ㅓㅣ': 'ㅔ',
    'ㅔㅣ': 'ㅖ',
    'ㅑㅣ': 'ㅒ',
    'ㅕㅣ': 'ㅖ',
    'ㅗㅏ': 'ㅘ',
    'ㅘㅣ': 'ㅙ',
    'ㅗㅣ': 'ㅚ',
    'ㅚㆍ': 'ㅘ', // This one seems off based on common usage, but keeping as per original
    'ㅠㅣ': 'ㅝ', // This one seems off based on common usage, should be ㅕ -> ㅛ -> ㅠ -> ㅝ?
    'ㅜㅓ': 'ㅝ',
    'ㅝㅣ': 'ㅞ',
    'ㅜㅣ': 'ㅟ'
};

// 여기는 COMPOSE_JONG (받침 조합)
const COMPOSE_JONG = {
    'ㄱㅅ': 'ㄳ',
    'ㄴㅈ': 'ㄵ',
    'ㄴㅎ': 'ㄶ',
    'ㄹㄱ': 'ㄺ',
    'ㄹㅁ': 'ㄻ',
    'ㄹㅂ': 'ㄼ',
    'ㄹㅅ': 'ㄽ',
    'ㄹㅌ': 'ㄾ',
    'ㄹㅍ': 'ㄿ',
    'ㄹㅎ': 'ㅀ',
    'ㅂㅅ': 'ㅄ'
};

const DECOMPOSE_JONG = {
    'ㄳ': ['ㄱ', 'ㅅ'],
    'ㄵ': ['ㄴ', 'ㅈ'],
    'ㄶ': ['ㄴ', 'ㅎ'],
    'ㄺ': ['ㄹ', 'ㄱ'],
    'ㄻ': ['ㄹ', 'ㅁ'],
    'ㄼ': ['ㄹ', 'ㅂ'],
    'ㄽ': ['ㄹ', 'ㅅ'],
    'ㄾ': ['ㄹ', 'ㅌ'],
    'ㄿ': ['ㄹ', 'ㅍ'],
    'ㅀ': ['ㄹ', 'ㅎ'],
    'ㅄ': ['ㅂ', 'ㅅ']
};

let buffer = '';
let cho = null;
let jung = null;
let dotSequenceCount = 0; // for 천지인 'ㆍ' input
let jong = null;
let lastSecondJong = null; // Used for displaying the second part of a decomposed double final consonant (e.g., 'ㅅ' in '찬ㅅ')
let firstJongOfDecomposed = null; // Used to store the first part of a decomposed double final consonant (e.g., 'ㄴ' in '찬ㅅ')

const outputDiv = document.getElementById('output');


function combineHangul(c, j, jo) {
    if (c === null && j === null && jo === null) return '';
    if (c === null && j === null) return jo || '';
    if (c === null && jo === null) return j || '';
    if (j === null && jo === null) return c || '';

    const choIdx = CHO.indexOf(c);
    const jungIdx = JUNG.indexOf(j);
    const jongIdx = jo ? JONG.indexOf(jo) : 0;

    if (choIdx !== -1 && jungIdx !== -1) {
        return String.fromCharCode(44032 + (choIdx * 21 * 28) + (jungIdx * 28) + jongIdx)
    } else {
        return (c || '') + (j || '') + (jo || '');
    }
}

function flush() {
    let charToFlush = '';
    console.log(`FLUSHING: Current state before flush char calc: cho=${cho}, jung=${jung}, jong=${jong}, dot=${dotSequenceCount}, lastSecondJong=${lastSecondJong}, firstJongOfDecomposed=${firstJongOfDecomposed}`);
    if (cho || jung || jong || dotSequenceCount > 0 || lastSecondJong) {
        if (cho && jung && (jong || firstJongOfDecomposed) && lastSecondJong) {
            // lastSecondJong 상태에서는 jong이 null이므로 firstJongOfDecomposed를 사용
            const currentJongPart = firstJongOfDecomposed;
            charToFlush = combineHangul(cho, jung, currentJongPart) + lastSecondJong;
            console.log(`Flushing: ${combineHangul(cho, jung, currentJongPart)} + ${lastSecondJong}`);
        } else if (cho && (dotSequenceCount === 1 || dotSequenceCount === 2)) {
            charToFlush = cho + (dotSequenceCount === 1 ? 'ㆍ' : 'ㆍㆍ');
            console.log(`Flushing: ${cho} + ${dotSequenceCount}ㆍ`);
        } else if (dotSequenceCount === 1) {
            charToFlush = 'ㆍ';
            console.log(`Flushing: ㆍ`);
        } else if (dotSequenceCount === 2) {
            charToFlush = 'ㆍㆍ';
            console.log(`Flushing: ㆍㆍ`);
        } else {
            charToFlush = combineHangul(cho, jung, jong);
            console.log(`Flushing: ${combineHangul(cho, jung, jong)}`);
        }
    }

    if (charToFlush) {
        buffer += charToFlush;
        console.log(`FLUSHED CHAR: "${charToFlush}" added to buffer. New buffer: "${buffer}"`);
    } else {
        console.log(`FLUSH: No character to flush.`);
    }

    cho = jung = jong = null;
    dotSequenceCount = 0;
    lastSecondJong = null;
    firstJongOfDecomposed = null;
    console.log(`FLUSH: State reset (cho, jung, jong, dot, lastSecondJong, firstJongOfDecomposed = null/0).`);
    console.log(`Flush completed. Buffer: ${buffer}`);
}

function render() {
    let inProgress = '';
    if (cho || jung || jong || dotSequenceCount > 0 || lastSecondJong) {
        if (cho && jung && (jong || firstJongOfDecomposed) && lastSecondJong) {
            // lastSecondJong 상태에서는 jong이 null이므로 firstJongOfDecomposed를 사용
            const currentJongPart = firstJongOfDecomposed;
            inProgress = combineHangul(cho, jung, currentJongPart) + lastSecondJong;
        } else if (cho && (dotSequenceCount === 1 || dotSequenceCount === 2)) {
            inProgress = cho + (dotSequenceCount === 1 ? 'ㆍ' : 'ㆍㆍ');
        } else if (dotSequenceCount === 1) {
            inProgress = 'ㆍ';
        } else if (dotSequenceCount === 2) {
            inProgress = 'ㆍㆍ';
        } else {
            inProgress = combineHangul(cho, jung, jong);
        }
    }
    outputDiv.innerHTML = buffer.replace(/\n/g, '<br>') + `<span class="inprogress">${inProgress}</span>`;
    console.log(`RENDERED: buffer="${buffer}", inProgress="${inProgress}"`);
}

function inputChar(key) {
    console.log(`--- Input: ${key} ---`);
    console.log(`Before: cho=${cho}, jung=${jung}, jong=${jong}, dot=${dotSequenceCount}, lastSecondJong=${lastSecondJong}, firstJongOfDecomposed=${firstJongOfDecomposed}`);

    // 특수 키 처리 (삭제, ◁, 초기화, 공백, Enter)
    if (key.length > 1) {
        if (key === '삭제') {
            console.log('Key: 삭제');
            if (lastSecondJong) {
                console.log('Deleting lastSecondJong...');
                const baseConsonantOfSecond = REVERSE_CYCLE_MAP[lastSecondJong] || lastSecondJong;
                const cycleListOfSecond = CYCLE_CONSONANT[baseConsonantOfSecond] || [baseConsonantOfSecond];
                const currentSecondIndex = cycleListOfSecond.indexOf(lastSecondJong);

                if (currentSecondIndex === 0) { // If it's the first in its cycle (e.g. 'ㅅ' in '찬ㅅ')
                    console.log('lastSecondJong is at start of cycle. Converting back to jong if possible.');
                    if (firstJongOfDecomposed) { // If there was a first part (e.g. 'ㄴ')
                        jong = firstJongOfDecomposed; // Revert to single jong
                    }
                    lastSecondJong = null;
                    firstJongOfDecomposed = null;
                } else { // Cycle backwards (e.g. 'ㅎ' in '찬ㅎ' to 'ㅅ' in '찬ㅅ')
                    console.log('Cycling lastSecondJong backwards.');
                    lastSecondJong = cycleListOfSecond[(currentSecondIndex - 1 + cycleListOfSecond.length) % cycleListOfSecond.length];
                }
            } else if (dotSequenceCount > 0) {
                console.log('Deleting dotSequence...');
                dotSequenceCount = dotSequenceCount === 2 ? 1 : 0;
                if (dotSequenceCount === 0) jung = null;
            } else if (jong) {
                console.log('Deleting jong...');
                jong = null;
            } else if (jung) {
                console.log('Deleting jung...');
                jung = null;
            } else if (cho) {
                console.log('Deleting cho...');
                cho = null;
            } else if (buffer.length > 0) {
                console.log('Deleting from buffer...');
                buffer = buffer.slice(0, -1);
            }
            render();
            return;
        } else if (key === '◁') {
            console.log('Key: ◁ (Clear current input)');
            if (cho || jung || jong || dotSequenceCount > 0 || lastSecondJong) {
                cho = jung = jong = null;
                dotSequenceCount = 0;
                lastSecondJong = null;
                firstJongOfDecomposed = null;
            } else if (buffer.length > 0) {
                buffer = buffer.slice(0, -1); // If nothing to clear, delete last char from buffer
            }
            render();
            return;
        } else if (key === '초기화') {
            console.log('Key: 초기화 (Reset all)');
            buffer = '';
            cho = jung = jong = null;
            dotSequenceCount = 0;
            lastSecondJong = null;
            firstJongOfDecomposed = null;
            render();
            return;
        } 
        
        // ===============================================
        // ========== 스페이스 키 로직 수정됨 ==========
        // ===============================================
        else if (key === '공백') {
            console.log('Key: 공백');
            // 현재 조합중인 글자가 있는지 확인
            if (cho || jung || jong || dotSequenceCount > 0 || lastSecondJong) {
                // 글자가 있으면, 현재 글자를 확정 (띄어쓰기 없음)
                flush();
            } else {
                // 조합중인 글자가 없으면, 한 칸 띄어쓰기
                buffer += ' ';
            }
            render();
            return;
        } 
        // ===============================================
        
        else if (key === 'Enter') {
            console.log('Key: Enter');
            flush();
            buffer += '\n';
            render();
            return;
        }
    }

    // 일반 자음 처리
    if (CHO.includes(key) || CYCLE_CONSONANT[key]) {
        console.log(`Key: ${key} (Consonant)`);
        const cycleList = CYCLE_CONSONANT[key] || [key];
        const firstConsonant = cycleList[0];

        // 1. lastSecondJong이 활성화된 상태 (겹받침 두 번째 자음 순환 중)
        if (lastSecondJong) {
            console.log(`State: lastSecondJong is active (${lastSecondJong})`);
            const baseConsonantOfSecond = REVERSE_CYCLE_MAP[lastSecondJong]; // e.g., 'ㅅ' if lastSecondJong is 'ㅅ' or 'ㅎ' or 'ㅆ'

            // 입력된 자음이 현재 순환 중인 두 번째 자음의 기본 자음과 같은 그룹인 경우
            if (REVERSE_CYCLE_MAP[key] === baseConsonantOfSecond) {
                console.log(`Input key ${key} is in same cycle group as lastSecondJong.`);
                // --- 특정 조합 규칙: 'ㄴ' + 'ㅎ' + 'ㅎ' -> 'ㄶ' (괜찮) ---
                // 현재 상태가 'ㄴ' (firstJongOfDecomposed) + 'ㅎ' (lastSecondJong) 이고,
                // 입력된 키가 'ㅎ'인 경우, 'ㄶ'으로 즉시 조합
                if (firstJongOfDecomposed === 'ㄴ' && lastSecondJong === 'ㅎ' && key === 'ㅎ') {
                    console.log(`Specific rule: ㄴ+ㅎ+ㅎ -> ㄶ (괜찮)`);
                    jong = COMPOSE_JONG['ㄴㅎ']; // 'ㄶ'으로 조합
                    lastSecondJong = null; // 조합 완료
                    firstJongOfDecomposed = null; // 조합 완료
                } else {
                    // 그 외의 경우 (예: '찬ㅅ' + 'ㅅ' -> '찬ㅎ' 또는 '찬ㅎ' + 'ㅆ' -> '찬ㅆ'),
                    // lastSecondJong만 다음 순환 자음으로 업데이트
                    console.log('Cycling lastSecondJong.');
                    const cycleListOfSecond = CYCLE_CONSONANT[baseConsonantOfSecond] || [baseConsonantOfSecond];
                    const currentSecondIndex = cycleListOfSecond.indexOf(lastSecondJong);
                    lastSecondJong = cycleListOfSecond[(currentSecondIndex + 1) % cycleListOfSecond.length];

                    // !!! 순환 후 즉시 겹받침 재조합 가능성 확인 !!!
                    if (firstJongOfDecomposed && COMPOSE_JONG[firstJongOfDecomposed + lastSecondJong]) {
                         console.log(`Decomposed jong recomposed: ${firstJongOfDecomposed} + ${lastSecondJong} -> ${COMPOSE_JONG[firstJongOfDecomposed + lastSecondJong]}`);
                         jong = COMPOSE_JONG[firstJongOfDecomposed + lastSecondJong];
                         lastSecondJong = null;
                         firstJongOfDecomposed = null;
                    }
                }
            } else { // 입력된 자음이 현재 lastSecondJong의 순환 그룹과 관계 없는 경우 (새 글자 시작)
                console.log(`Input key ${key} is not related to lastSecondJong cycle. Flushing current.`);
                const currentWordFirstPart = combineHangul(cho, jung, firstJongOfDecomposed);
                buffer += currentWordFirstPart + lastSecondJong;

                cho = firstConsonant;
                jung = null;
                jong = null;
                lastSecondJong = null;
                firstJongOfDecomposed = null;
            }
        }
        // 2. 현재 글자에 받침이 있는 경우 (lastSecondJong 없는 상태)
        else if (jong) {
            console.log(`State: jong is active (${jong}).`);
            const decomposedJong = DECOMPOSE_JONG[jong]; // For 'ㄶ', decomposedJong is ['ㄴ', 'ㅎ']

            // 2-2. 현재 받침이 겹받침이고, 입력된 자음이 그 두 번째 자음과 순환 가능한 경우 (예: '괜찮'의 'ㄶ' 받침에서 'ㅎ' 또는 'ㅅ' 입력 시)
            if (decomposedJong && REVERSE_CYCLE_MAP[key] === REVERSE_CYCLE_MAP[decomposedJong[1]]) {
                console.log(`jong is decomposable (${jong}), and key ${key} cycles second part.`);
                const baseConsonantOfSecond = REVERSE_CYCLE_MAP[decomposedJong[1]];
                const cycleListOfSecond = CYCLE_CONSONANT[baseConsonantOfSecond] || [baseConsonantOfSecond];
                const currentSecondIndex = cycleListOfSecond.indexOf(decomposedJong[1]);
                lastSecondJong = cycleListOfSecond[(currentSecondIndex + 1) % cycleListOfSecond.length];

                firstJongOfDecomposed = decomposedJong[0];
                jong = null;

                // 겹받침이 분해된 상태에서 순환된 lastSecondJong이 다시 합쳐질 수 있다면 즉시 복원 (예: 'ㄳ' -> 'ㄱㅅ' -> 'ㄱㅆ' -> 'ㄳ')
                if (firstJongOfDecomposed && COMPOSE_JONG[firstJongOfDecomposed + lastSecondJong]) {
                    console.log(`Decomposed jong recomposed: ${firstJongOfDecomposed} + ${lastSecondJong} -> ${COMPOSE_JONG[firstJongOfDecomposed + lastSecondJong]}`);
                    jong = COMPOSE_JONG[firstJongOfDecomposed + lastSecondJong];
                    lastSecondJong = null;
                    firstJongOfDecomposed = null;
                }
            }
            // 2-3. 현재 받침(홑받침 또는 겹받침의 첫 자음)과 입력된 자음이 겹받침을 이룰 수 있는 경우 (예: 'ㄴ' + 'ㅎ' -> 'ㄶ')
            else if (COMPOSE_JONG[jong + firstConsonant]) {
                console.log(`jong ${jong} and key ${key} can form COMPOSE_JONG.`);
                jong = COMPOSE_JONG[jong + firstConsonant];
            }
            // 2-4. 현재 홑받침과 입력된 자음이 새로운 '겹받침'으로 시작될 수 있는 경우 (예: 'ㄴ' + 'ㅅ' -> 'ㄴㅅ' 형태로 진입)
            else if (!decomposedJong && Object.values(DECOMPOSE_JONG).some(arr => arr[0] === jong && REVERSE_CYCLE_MAP[arr[1]] === key)) {
                console.log(`jong ${jong} can decompose with key ${key}.`);
                firstJongOfDecomposed = jong;
                lastSecondJong = firstConsonant;
                jong = null;
            }
            // 2-5. 현재 홑받침이 입력된 자음과 순환 가능한 경우 (예: 'ㄱ' + 'ㄱ' -> 'ㄲ')
            else if (!decomposedJong && REVERSE_CYCLE_MAP[jong] === key) {
                console.log(`jong ${jong} can cycle with key ${key}.`);
                jong = cycleList[(cycleList.indexOf(jong) + 1) % cycleList.length];
            }
            // 2-6. 그 외의 경우 (현재 글자 확정하고 새 초성 시작)
            else {
                console.log('No specific jong rule applies. Flushing and starting new cho.');
                flush();
                cho = firstConsonant;
            }
        }
        // 3. 초성 + 중성만 있는 경우
        else if (cho && jung) {
            console.log('State: cho+jung. Setting jong.');
            jong = firstConsonant;
        }
        // 4. 초성만 있는 경우 (Only cho exists)
        else if (cho) {
            console.log('State: cho only.');
            if (REVERSE_CYCLE_MAP[cho] === key) { // Try to cycle cho (e.g., ㄱ -> ㄲ)
                console.log('Cycling cho.');
                cho = cycleList[(cycleList.indexOf(cho) + 1) % cycleList.length];
            }
            else { // New consonant (key) is not a cycle of cho. Flush current cho and start new cho.
                console.log('Not a cycle. Flushing current cho and starting new cho.');
                flush(); // 이전 `cho`를 버퍼에 확정
                cho = firstConsonant; // 새로운 `cho` 설정
            }
        }
        // 5. 아무것도 없는 빈 상태 (새 글자 초성 시작)
        else {
            console.log('State: empty. Starting new cho.');
            flush();
            cho = firstConsonant;
            console.log(`CHO set to "${cho}" after flush.`);
        }

        if (dotSequenceCount > 0) {
            console.log('Resetting dotSequenceCount after consonant input.');
            dotSequenceCount = 0;
            jung = null; // Clear jung if it was from a dot sequence
        }
    }
    // 모음 처리
    else if (JUNG.includes(key) || ['ㅣ', 'ㆍ', 'ㅡ'].includes(key)) {
        console.log(`Key: ${key} (Vowel)`);
        
        if (lastSecondJong) {
            console.log(`State: lastSecondJong active. Finalizing previous syllable and starting new one.`);
            const newCho = lastSecondJong;
            jong = firstJongOfDecomposed;
            lastSecondJong = null;
            firstJongOfDecomposed = null;
            flush();
            cho = newCho;
            jung = key;
            dotSequenceCount = (key === 'ㆍ') ? 1 : 0;
        } 
        else if (jong) {
            console.log(`State: jong active (${jong}). Processing vowel.`);
            const oldJong = jong;
            const decomposable = DECOMPOSE_JONG[oldJong];
            let newCho;

            if (decomposable) { 
                console.log(`Decomposable jong (${oldJong}) + vowel. Moving second part to cho.`);
                jong = decomposable[0];
                newCho = decomposable[1]; 
                flush();
                cho = newCho;
                jung = key;
                dotSequenceCount = (key === 'ㆍ') ? 1 : 0;
            }
            else { 
                console.log(`Single jong (${oldJong}) + vowel. Moving jong to cho.`);
                jong = null;
                flush();
                cho = oldJong;
                jung = key;
                dotSequenceCount = (key === 'ㆍ') ? 1 : 0;
            }
        } else if (jung || dotSequenceCount > 0) {
            console.log(`State: jung (${jung}) or dotSequence active (${dotSequenceCount}).`);
            let combined = null;
            if (dotSequenceCount === 2) {
                if (key === 'ㅣ') {
                    jung = 'ㅕ';
                    dotSequenceCount = 0;
                    console.log(`ㆍㆍ + ㅣ -> ㅕ 조합 성공.`);
                } else if (key === 'ㅡ') {
                    jung = 'ㅛ';
                    dotSequenceCount = 0;
                    console.log(`ㆍㆍ + ㅡ -> ㅛ 조합 성공.`);
                } else {
                    console.log(`ㆍㆍ + other vowel. Flushing ㆍㆍ.`);
                    flush();
                    jung = key;
                    dotSequenceCount = (key === 'ㆍ') ? 1 : 0;
                }
            } else if (dotSequenceCount === 1) {
                if (key === 'ㆍ') {
                    jung = null;
                    dotSequenceCount = 2;
                    console.log(`두 번째 'ㆍ' 입력. dotSequenceCount=2.`);
                } else {
                    combined = COMPOSE_JUNG['ㆍ' + key];
                    if (combined) {
                        jung = combined;
                        dotSequenceCount = 0;
                        console.log(`'ㆍ'와 ${key} 조합 성공: ${combined}`);
                    } else {
                        console.log(`'ㆍ'와 ${key} 조합 실패. 현재 'ㆍ' 확정.`);
                        flush();
                        jung = key;
                        dotSequenceCount = (key === 'ㆍ') ? 1 : 0;
                    }
                }
            } else {
                console.log(`일반 중성 조합 시도: jung=${jung}, key=${key}.`);
                combined = COMPOSE_JUNG[jung + key];
                if (combined) {
                    jung = combined;
                    dotSequenceCount = 0;
                    console.log(`일반 중성 ${jung}과 ${key} 조합 성공: ${combined}`);
                } else {
                    console.log(`일반 중성 ${jung}과 ${key} 조합 실패. 현재 글자 확정.`);
                    flush();
                    jung = key;
                    dotSequenceCount = (key === 'ㆍ') ? 1 : 0;
                }
            }
        } else if (cho) {
            console.log(`초성에 첫 모음 입력: ${key}.`);
            jung = key;
            dotSequenceCount = (key === 'ㆍ') ? 1 : 0;
        } else {
            console.log(`State: empty. Vowel ${key} input as single char.`);
            flush();
            buffer += key;
            jung = null;
            dotSequenceCount = 0;
        }
    }
    // 자음/모음이 아닌 기타 문자 입력
    else {
        console.log(`Key: ${key} (Other character). Flushing current and adding to buffer.`);
        flush();
        buffer += key;
        dotSequenceCount = 0;
        lastSecondJong = null;
        firstJongOfDecomposed = null;
    }
    console.log(`After: cho=${cho}, jung=${jung}, jong=${jong}, dot=${dotSequenceCount}, lastSecondJong=${lastSecondJong}, firstJongOfDecomposed=${firstJongOfDecomposed}`);
    render();
}

document.querySelectorAll('.key').forEach(keyEl => {
    keyEl.addEventListener('click', () => {
        const key = keyEl.getAttribute('data-char');
        if (key === ' ') {
            inputChar('공백')
        } else if (key && key.trim() !== '') {
            inputChar(key)
        }
    })
});

render();