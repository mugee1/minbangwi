/**
 * 무사이(MUSAI) 1차 사용성 테스트 설문 — 구글폼 자동 생성 스크립트
 *
 * 사용법
 * 1. https://script.google.com → 새 프로젝트
 * 2. 이 파일 내용을 전부 붙여 넣고 저장
 * 3. 위쪽 함수 선택에서 createMusaiForm 선택 → 실행 → 권한 허용
 * 4. 실행 로그에 나온 "응답 주소"를 참가자에게 보내기
 *    (폼과 연결된 응답 스프레드시트도 함께 만들어져요)
 */
const APP_URL = 'https://mugee1.github.io/minbangwi/';
const ROUND = '1차';

function createMusaiForm() {
  const form = FormApp.create('무사이 ' + ROUND + ' 사용성 테스트');
  form.setDescription(
    '3D 공간에서 걸으며 대피 순서를 익히는 웹 서비스 "무사이"를 써 보고 의견을 남겨 주세요.\n' +
    '· 소요 시간: 약 15분 (서비스 체험 8~10분 + 설문 5분)\n' +
    '· 이름·연락처 같은 개인정보는 받지 않아요. 응답은 서비스 개선과 수업 발표 자료(통계)에만 쓰여요.\n' +
    '· 정답을 맞히는 시험이 아니에요. 헷갈린 곳은 서비스를 고칠 단서가 돼요.'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('참여해 주셔서 고마워요! 남겨 주신 의견으로 무사이를 더 쉽게 고칠게요.');

  const AGREE5 = ['전혀 아니에요', '아니에요', '보통이에요', '그래요', '매우 그래요'];

  // ── 1. 참가자 정보 (첫 페이지: 폼 설명 바로 아래) ──────────
  form.addSectionHeaderItem().setTitle('나에 대해 알려 주세요');
  form.addMultipleChoiceItem().setTitle('나이대').setRequired(true)
    .setChoiceValues(['10대 이하', '20대', '30대', '40대', '50대 이상']);
  form.addMultipleChoiceItem().setTitle('어떤 기기로 체험하나요?').setRequired(true)
    .setChoiceValues(['PC · 노트북', '휴대폰', '태블릿']);
  form.addMultipleChoiceItem().setTitle('3D 게임(캐릭터를 움직이는 게임)을 얼마나 해 봤나요?').setRequired(true)
    .setChoiceValues(['거의 안 해요', '가끔 해요', '자주 해요']);
  form.addMultipleChoiceItem().setTitle('민방위 훈련이나 학교·회사 대피 훈련에 참여해 본 적 있나요?').setRequired(true)
    .setChoiceValues(['없어요', '1~2번', '3번 이상']);

  // ── 2. 체험 전 퀴즈 (학습 효과 비교용) ──────────
  form.addPageBreakItem()
    .setTitle('체험 전 퀴즈')
    .setHelpText('지금 알고 있는 대로 골라 주세요. 모르면 "잘 모르겠어요"를 골라도 괜찮아요.');
  addQuiz(form, '체험 전');
  form.addScaleItem()
    .setTitle('[체험 전] 공습경보가 울리면 무엇을 해야 하는지 알고 있어요.')
    .setBounds(1, 5).setLabels('전혀 모르겠어요', '잘 알고 있어요').setRequired(true);

  // ── 3. 서비스 체험 안내 ───────────────────────
  form.addPageBreakItem()
    .setTitle('이제 무사이를 체험해 주세요')
    .setHelpText(
      '아래 주소를 새 창에서 열고, "대피 1세트 완료" 화면이 나올 때까지 진행해 주세요.\n' +
      APP_URL + '\n\n' +
      '· 소리를 켜 주세요 (사이렌·안내 방송이 나와요).\n' +
      '· 완료 화면의 "걸린 시간"을 기억해 두세요.\n' +
      '· 도중에 막혀서 더 못 하겠다면 그만두고 돌아와도 괜찮아요.\n' +
      '다 했으면 "다음"을 눌러 주세요.'
    );

  // ── 4. 과업 수행 ─────────────────────────────
  form.addPageBreakItem().setTitle('체험 결과');
  form.addMultipleChoiceItem().setTitle('어디까지 진행했나요?').setRequired(true)
    .setChoiceValues([
      '끝까지 완료했어요 (대피 1세트 완료 화면을 봤어요)',
      '집에서 멈췄어요 (가방 챙기기 · 현관)',
      '복도에서 멈췄어요 (엘리베이터 · 계단)',
      '대피소에서 멈췄어요 (자리 · 라디오 · 방송)',
      '화생방 단계에서 멈췄어요 (코·입 가리기 · 위층 이동)',
      '바깥 공기 막기에서 멈췄어요 (창문 · 문틈 · 환풍기)',
    ]);
  form.addTextItem().setTitle('완료 화면의 "걸린 시간" (분)')
    .setHelpText('분 단위 숫자로 적어 주세요. 초는 반올림해요. 예: 2분 40초 → 3, 2분 10초 → 2 (끝까지 못 했다면 비워 두세요)')
    .setValidation(FormApp.createTextValidation().requireNumberBetween(0, 60).setHelpText('0~60 사이 숫자로 적어 주세요.').build());
  form.addMultipleChoiceItem().setTitle('복도에서 처음 고른 길은 무엇이었나요?').setRequired(true)
    .setChoiceValues(['비상계단', '엘리베이터', '기억이 안 나요 / 거기까지 못 갔어요']);
  form.addGridItem()
    .setTitle('각 단계를 어떻게 해냈나요?')
    .setHelpText('기억나는 대로 골라 주세요.')
    .setRows([
      '① 비상 가방 챙기기',
      '② 현관까지 가서 복도로 나가기',
      '③ 비상계단으로 내려가기',
      '④ 대피소 빈 자리에 앉기',
      '⑤ 라디오 켜서 방송 듣기',
      '⑥ 코·입 가리기',
      '⑦ 계단으로 다시 위층에 올라가기',
      '⑧ 창문·문틈·환풍기 3곳 막기',
      '⑨ 경보해제 방송 듣기',
    ])
    .setColumns(['혼자 바로 했어요', '조금 헤매다 했어요', '안내를 받고서야 했어요', '못 했어요 / 기억 안 나요'])
    .setRequired(true);
  form.addScaleItem()
    .setTitle('전체적으로 얼마나 쉬웠나요?')
    .setBounds(1, 7).setLabels('매우 어려웠어요', '매우 쉬웠어요').setRequired(true);
  form.addParagraphTextItem()
    .setTitle('가장 헷갈리거나 멈칫했던 순간은 언제였나요?')
    .setHelpText('예: "가방 버튼을 못 찾았어요", "어디로 가야 할지 몰랐어요"');
  form.addCheckboxItem().setTitle('체험 중 이런 문제가 있었나요?').setRequired(true)
    .setChoiceValues(['문제 없었어요', '화면이 느리거나 끊겼어요', '소리가 안 났어요', '글자나 버튼이 화면 밖으로 나갔어요', '화면이 하얗게/까맣게 나왔어요'])
    .showOtherOption(true);

  // ── 5. 체험 후 퀴즈 ──────────────────────────
  form.addPageBreakItem()
    .setTitle('체험 후 퀴즈')
    .setHelpText('체험 전과 같은 문제예요. 지금 생각대로 골라 주세요.');
  addQuiz(form, '체험 후');
  form.addScaleItem()
    .setTitle('[체험 후] 공습경보가 울리면 무엇을 해야 하는지 알고 있어요.')
    .setBounds(1, 5).setLabels('전혀 모르겠어요', '잘 알고 있어요').setRequired(true);

  // ── 6. 화면 · 디자인 평가 ─────────────────────
  form.addPageBreakItem().setTitle('화면과 디자인');
  form.addGridItem()
    .setTitle('얼마나 그런가요?')
    .setRows([
      '지금 무엇을 해야 하는지 바로 알 수 있었어요',
      '바닥의 파란 링과 길 안내 점이 잘 보였어요',
      '가방 · 코·입 · 방송 버튼을 쉽게 찾았어요',
      '글자 크기와 색이 읽기 편했어요',
      '안내원 말풍선과 알림 메시지가 구분됐어요',
      '걷기 · 시점 돌리기 조작이 쉬웠어요',
      '경보 장면(깜빡임 · 사이렌)이 지나치게 무섭지 않았어요',
      '캐릭터와 공간이 친근하게 느껴졌어요',
    ])
    .setColumns(AGREE5)
    .setRequired(true);
  // UMUX-Lite (2문항, 7점)
  form.addScaleItem().setTitle('무사이는 대피 순서를 익히는 데 도움이 돼요.')
    .setBounds(1, 7).setLabels('전혀 아니에요', '매우 그래요').setRequired(true);
  form.addScaleItem().setTitle('무사이는 쓰기 쉬워요.')
    .setBounds(1, 7).setLabels('전혀 아니에요', '매우 그래요').setRequired(true);

  // ── 7. 마지막 의견 ───────────────────────────
  form.addPageBreakItem().setTitle('마지막으로');
  form.addParagraphTextItem().setTitle('가장 좋았던 점은 무엇인가요?');
  form.addParagraphTextItem().setTitle('딱 하나만 바꾼다면 무엇을 바꾸고 싶나요?');

  // 응답 스프레드시트 연결
  const ss = SpreadsheetApp.create('무사이 ' + ROUND + ' 사용성 테스트 (응답)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('응답 주소(참가자용): ' + form.getPublishedUrl());
  Logger.log('짧은 주소: ' + form.shortenFormUrl(form.getPublishedUrl()));
  Logger.log('편집 주소: ' + form.getEditUrl());
  Logger.log('응답 시트: ' + ss.getUrl());
}

// 체험 전·후에 똑같이 쓰는 행동요령 퀴즈 4문항
// 정답: Q1 지하 대피시설이나 건물 지하 · Q2 비상계단 · Q3 높은 층 실내 · Q4 창문·문을 닫고 틈을 막고, 환풍기를 꺼요
function addQuiz(form, tag) {
  const quiz = [
    ['공습경보가 울리면 어디로 대피하나요?',
      ['건물의 높은 층', '지하 대피시설이나 건물 지하', '집 안 화장실', '잘 모르겠어요']],
    ['10층에 있을 때 아래로 대피하려면 무엇을 이용하나요?',
      ['엘리베이터', '둘 다 괜찮아요', '비상계단', '잘 모르겠어요']],
    ['화생방(화학 공격) 경보가 울리면 어디로 가나요?',
      ['지하 대피시설', '높은 층 실내', '건물 밖 넓은 곳', '잘 모르겠어요']],
    ['화생방 상황에서 실내에 있을 때 할 일로 맞는 것은?',
      ['창문을 열어 환기해요', '에어컨을 켜서 공기를 바꿔요', '창문·문을 닫고 틈을 막고, 환풍기를 꺼요', '잘 모르겠어요']],
  ];
  quiz.forEach(([title, choices], i) => {
    form.addMultipleChoiceItem()
      .setTitle('[' + tag + '] Q' + (i + 1) + '. ' + title)
      .setChoiceValues(choices)
      .setRequired(true);
  });
}
