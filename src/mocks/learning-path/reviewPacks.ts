import { choice, gap, tfng, toPassage, MOCK_PARAPHRASE_TRAP, MOCK_WRONG_PARAGRAPH, type MockReviewSet } from './contentTypes'

const PARAGRAPHS: [string, string][] = [['A', 'Paragraph A'], ['B', 'Paragraph B']]

/** Any paragraph other than the right one is the same mistake: looking in the wrong place. */
const wrongParagraph = (correct: string) =>
  Object.fromEntries(PARAGRAPHS.filter(([value]) => value !== correct).map(([value]) => [value, MOCK_WRONG_PARAGRAPH]))

/** Three sets per knowledge point: a learner who fails all three is marked SKIPPED. */
export const MOCK_REVIEW_PACKS: Record<string, MockReviewSet[]> = {
  KP1: [
    {
      packageCode: 'PS-KP1-A',
      passage: toPassage('The Trans-Siberian Railway', [[null, 'Construction of the Trans-Siberian Railway began in 1891 and the main line was completed in 1916. At 9,289 kilometres, it remains the longest railway line in the world, and a journey from Moscow to Vladivostok takes about seven days.']]),
      questions: [
        gap('r-kp1a-1', 1, 'In which year was the main line completed?', ['1916'], '"The main line was completed in 1916". 1891 là năm khởi công.'),
        choice('r-kp1a-2', 2, 'How long does the Moscow–Vladivostok journey take?', [['A', 'about seven days'], ['B', 'about nine days'], ['C', 'about sixteen days']], 'A', '"Takes about seven days". Con số 9,289 là chiều dài tuyến, không phải số ngày.'),
      ],
    },
    {
      packageCode: 'PS-KP1-B',
      passage: toPassage('The Eiffel Tower', [[null, "The Eiffel Tower was built for the 1889 World's Fair in Paris. It took 300 workers just over two years to assemble its 18,038 iron parts. At 300 metres, it was the tallest structure in the world until 1930."]]),
      questions: [
        gap('r-kp1b-1', 1, 'How many workers built the tower?', ['300'], '"It took 300 workers". Lưu ý 300 mét là chiều cao, cùng con số nhưng khác thông tin.'),
        choice('r-kp1b-2', 2, 'Until when was it the tallest structure in the world?', [['A', '1889'], ['B', '1930'], ['C', '1931']], 'B', '"The tallest structure in the world until 1930".'),
      ],
    },
    {
      packageCode: 'PS-KP1-C',
      passage: toPassage('Emperor Penguins', [[null, 'Emperor penguins are the largest of the 18 penguin species, standing up to 1.2 metres tall. During the winter, males keep the eggs warm for about 65 days without eating, while females travel up to 80 kilometres to the sea to feed.']]),
      questions: [
        gap('r-kp1c-1', 1, 'For how many days do males keep the eggs warm?', ['65'], '"Keep the eggs warm for about 65 days".'),
        choice('r-kp1c-2', 2, 'How far do females travel to feed?', [['A', '1.2 kilometres'], ['B', '18 kilometres'], ['C', 'up to 80 kilometres']], 'C', '"Females travel up to 80 kilometres to the sea".'),
      ],
    },
  ],
  KP2: [
    {
      packageCode: 'PS-KP2-A',
      passage: toPassage('Urban Foxes', [[null, 'Foxes have adapted remarkably well to city life. Rather than hunting, many urban foxes rely on food that people throw away.']]),
      questions: [
        choice('r-kp2a-1', 1, 'Urban foxes mainly', [['A', 'hunt small animals'], ['B', 'eat food discarded by people'], ['C', 'avoid areas with people']], 'B', '"Food that people throw away" = "food discarded by people".'),
        choice('r-kp2a-2', 2, '"Adapted remarkably well" is closest in meaning to', [['A', 'changed very little'], ['B', 'adjusted extremely successfully'], ['C', 'moved very quickly']], 'B', '"Remarkably well" ≈ "extremely successfully".', { A: MOCK_PARAPHRASE_TRAP }),
      ],
    },
    {
      packageCode: 'PS-KP2-B',
      passage: toPassage('Studying Online', [[null, 'Online courses allow students to study at their own pace, but many learners find it hard to stay motivated without a teacher present.']]),
      questions: [
        choice('r-kp2b-1', 1, 'One advantage of online courses is that students can', [['A', 'decide how fast they learn'], ['B', 'meet teachers often'], ['C', 'finish sooner']], 'A', '"At their own pace" = "decide how fast they learn".'),
        choice('r-kp2b-2', 2, 'A common difficulty is', [['A', 'the high cost'], ['B', 'keeping up enthusiasm'], ['C', 'slow internet']], 'B', '"Hard to stay motivated" = "keeping up enthusiasm".'),
      ],
    },
    {
      packageCode: 'PS-KP2-C',
      passage: toPassage('Modern Libraries', [[null, 'Public libraries are no longer simply places to borrow books; they now host coding clubs, job workshops and language classes.']]),
      questions: [
        choice('r-kp2c-1', 1, 'Modern libraries', [['A', 'have stopped lending books'], ['B', 'offer a wider range of activities'], ['C', 'only serve students']], 'B', 'Thư viện vẫn cho mượn sách nhưng "now host" thêm nhiều hoạt động.'),
        choice('r-kp2c-2', 2, '"No longer simply" suggests that libraries are', [['A', 'more than just book lenders'], ['B', 'closing down'], ['C', 'rarely used']], 'A', '"No longer simply places to borrow books" → không chỉ là nơi mượn sách.', { B: MOCK_PARAPHRASE_TRAP }),
      ],
    },
  ],
  KP3: [
    {
      packageCode: 'PS-KP3-A',
      passage: toPassage('Bamboo', [['A', 'Bamboo is one of the fastest-growing plants on Earth; some species grow almost a metre in a single day.'], ['B', 'Because it is strong and light, bamboo is used to build houses, bridges and even bicycles in many parts of Asia.']]),
      questions: [
        choice('r-kp3a-1', 1, 'Which paragraph focuses on how bamboo is used?', PARAGRAPHS, 'B', 'Đoạn B liệt kê nhà, cầu, xe đạp làm từ tre.', wrongParagraph('B')),
        choice('r-kp3a-2', 2, "Which paragraph focuses on bamboo's growth rate?", PARAGRAPHS, 'A', 'Đoạn A nói tre lớn gần một mét mỗi ngày.', wrongParagraph('A')),
      ],
    },
    {
      packageCode: 'PS-KP3-B',
      passage: toPassage('Living with Volcanoes', [['A', 'Volcanic eruptions can destroy towns and farmland within hours.'], ['B', 'Yet volcanic ash also makes soil very fertile, which is why farmers often return to live near volcanoes.']]),
      questions: [
        choice('r-kp3b-1', 1, 'Which paragraph describes a benefit of volcanoes?', PARAGRAPHS, 'B', 'Từ chuyển ý "Yet" mở ra lợi ích: đất màu mỡ.', wrongParagraph('B')),
        choice('r-kp3b-2', 2, 'Which paragraph describes the danger of volcanoes?', PARAGRAPHS, 'A', 'Đoạn A nói phun trào phá hủy thị trấn và đồng ruộng.', wrongParagraph('A')),
      ],
    },
    {
      packageCode: 'PS-KP3-C',
      passage: toPassage('Recycling at Home', [['A', 'Recycling one aluminium can saves enough energy to run a television for three hours.'], ['B', 'However, mixing food waste with recyclables can ruin a whole load, so careful sorting at home is essential.']]),
      questions: [
        choice('r-kp3c-1', 1, 'Which paragraph explains why sorting matters?', PARAGRAPHS, 'B', '"However… careful sorting at home is essential".', wrongParagraph('B')),
        choice('r-kp3c-2', 2, 'Which paragraph gives an example of energy saved?', PARAGRAPHS, 'A', 'Đoạn A: một lon nhôm đủ chạy TV ba giờ.', wrongParagraph('A')),
      ],
    },
  ],
  // The True / False / Not Given point: every False and Not Given question carries its trap (see `tfng`).
  KP5: [
    {
      packageCode: 'PS-KP5-A',
      passage: toPassage('The Ferry', [[null, 'The ferry leaves Riverton at 08:30 and 10:00. Cycles may be taken on board for a small fee.']]),
      questions: [
        tfng('r-kp5a-1', 1, 'The first ferry leaves at 09:00.', 'FALSE', 'Bài ghi 08:30, mâu thuẫn trực tiếp với 09:00 nên là False.'),
        tfng('r-kp5a-2', 2, 'Meals are served on board.', 'NOT GIVEN', 'Bài không nhắc tới đồ ăn trên phà, nên là Not Given chứ không phải False.'),
        tfng('r-kp5a-3', 3, 'Bicycles can be taken on the ferry.', 'TRUE', '"Cycles may be taken on board" khớp với câu hỏi.'),
      ],
    },
    {
      packageCode: 'PS-KP5-B',
      passage: toPassage('The Public Garden', [[null, 'The garden has been open to visitors since 2018. Entry is free, and dogs must be kept on a lead.']]),
      questions: [
        tfng('r-kp5b-1', 1, 'The garden first opened in 2020.', 'FALSE', 'Bài nói mở cửa từ 2018, nên 2020 bị mâu thuẫn.'),
        tfng('r-kp5b-2', 2, 'There is a café in the garden.', 'NOT GIVEN', 'Bài không nói gì về quán cà phê.'),
        tfng('r-kp5b-3', 3, 'Visitors do not pay to enter.', 'TRUE', '"Entry is free" = không phải trả tiền vào cổng.'),
      ],
    },
    {
      packageCode: 'PS-KP5-C',
      passage: toPassage('The Reading Room', [[null, 'The reading room is open from 09:00 to 17:00 on weekdays. Silence is required on the upper floor.']]),
      questions: [
        tfng('r-kp5c-1', 1, 'The reading room opens at weekends.', 'NOT GIVEN', 'Bài chỉ nói giờ mở cửa ngày thường, không nói gì về cuối tuần.'),
        tfng('r-kp5c-2', 2, 'The reading room closes at 18:00 on weekdays.', 'FALSE', 'Bài ghi 17:00, mâu thuẫn với 18:00.'),
        tfng('r-kp5c-3', 3, 'Visitors must be quiet upstairs.', 'TRUE', '"Silence is required on the upper floor".'),
      ],
    },
  ],
  KP4: [
    {
      packageCode: 'PS-KP4-A',
      passage: toPassage('Honey', [[null, 'Honey never spoils if it is stored properly. Archaeologists have found pots of honey in ancient Egyptian tombs that were still edible after 3,000 years.']]),
      questions: [
        gap('r-kp4a-1', 1, 'Honey found in Egyptian ______ could still be eaten.', ['tombs', 'tomb'], '"Ancient Egyptian tombs… still edible".'),
        gap('r-kp4a-2', 2, 'Honey lasts if it is ______ properly.', ['stored'], '"If it is stored properly".'),
      ],
    },
    {
      packageCode: 'PS-KP4-B',
      passage: toPassage('Octopuses', [[null, 'Octopuses can change the colour of their skin in less than a second, which helps them hide from predators and communicate with other octopuses.']]),
      questions: [
        gap('r-kp4b-1', 1, 'Changing colour helps octopuses hide from ______.', ['predators'], '"Hide from predators".'),
        gap('r-kp4b-2', 2, 'They can change colour in less than a ______.', ['second'], '"In less than a second".'),
      ],
    },
    {
      packageCode: 'PS-KP4-C',
      passage: toPassage('Salt', [[null, "In ancient Rome, salt was so valuable that soldiers were sometimes paid with it. The word 'salary' comes from the Latin word for salt."]]),
      questions: [
        gap('r-kp4c-1', 1, 'Roman soldiers were sometimes ______ with salt.', ['paid'], '"Soldiers were sometimes paid with it".'),
        gap('r-kp4c-2', 2, "The word 'salary' comes from ______.", ['latin'], '"Comes from the Latin word for salt".'),
      ],
    },
  ],
}
