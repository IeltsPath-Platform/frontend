import { choice, gap, passage, text, tfng, type MockLesson } from './contentTypes'

const L1: MockLesson = {
  id: 'lesson-l1',
  topicId: 'topic-demo-reading',
  title: 'Nhận diện paraphrase',
  sortOrder: 1,
  estimatedMinutes: 12,
  blocks: [
    text('l1-theory', 1, 'Đề IELTS hiếm khi lặp lại nguyên văn câu trong bài đọc. Thay vào đó, đề dùng paraphrase: cùng ý nhưng đổi từ hoặc đổi cấu trúc.\n\nCách làm:\n1. Gạch từ khóa trong câu hỏi.\n2. Nghĩ trước vài cách nói khác của từ khóa đó (quicker → faster, sense → feeling).\n3. Tìm đoạn chứa ý tương đương, không phải từ giống hệt.'),
    passage('l1-passage', 2, 'The Bicycle: A Slow Revolution', [
      ['A', 'In 1817, the German inventor Karl Drais unveiled a two-wheeled "running machine" that riders pushed along with their feet. It had no pedals, yet it could cover the 14 kilometres between Mannheim and a nearby inn in under an hour, far quicker than walking.'],
      ['B', 'Pedals arrived in the 1860s, when French blacksmiths attached cranks directly to the front wheel. To travel further with each turn of the pedals, makers enlarged the front wheel, producing the famous "penny-farthing". Its height made it fast but dangerous, and falls were common.'],
      ['C', 'The so-called safety bicycle of the 1880s solved this problem. With two wheels of equal size and a chain driving the rear wheel, it was stable enough for almost anyone to ride. Within a decade, cycling had become a popular pastime for women as well as men, giving many of them a new sense of independence.'],
    ]),
    {
      id: 'l1-ex', sortOrder: 3, type: 'EXERCISE', title: 'Luyện tập: paraphrase', knowledgePointCode: 'KP2',
      instructions: 'Chọn đáp án đúng cho câu 1–2. Câu 3 điền KHÔNG QUÁ MỘT TỪ lấy từ bài đọc.',
      questions: [
        choice('q-l1-1', 1, "According to paragraph A, Drais's machine was", [['A', 'powered by pedals'], ['B', 'faster than going on foot'], ['C', 'able to carry passengers']], 'B', '"Far quicker than walking" được diễn đạt lại thành "faster than going on foot". Bài nói rõ "it had no pedals" nên A sai; C không được nhắc tới.'),
        choice('q-l1-2', 2, 'Why did makers enlarge the front wheel?', [['A', 'to make the bicycle safer'], ['B', 'to cover more distance with each pedal turn'], ['C', 'to make it easier to climb on']], 'B', '"Travel further with each turn of the pedals" = "cover more distance with each pedal turn". Bài nói xe "dangerous" nên A sai.'),
        gap('q-l1-3', 3, 'The safety bicycle gave many women a new feeling of ______.', ['independence'], '"A new sense of independence" được paraphrase thành "a new feeling of independence".'),
      ],
    },
  ],
}

const L2: MockLesson = {
  id: 'lesson-l2',
  topicId: 'topic-demo-reading',
  title: 'Scanning: tìm thông tin cụ thể',
  sortOrder: 2,
  estimatedMinutes: 15,
  blocks: [
    text('l2-theory', 1, 'Scanning là lướt mắt tìm một "điểm neo" dễ thấy: con số, năm, tên riêng, chữ in hoa.\n\nCách làm:\n1. Xác định loại thông tin cần tìm (số lượng, năm, tên tàu…).\n2. Lướt nhanh chỉ để bắt điểm neo, chưa đọc kỹ.\n3. Khi thấy điểm neo, đọc kỹ cả câu chứa nó và câu kế tiếp.\n\nBẫy thường gặp: hai thông tin gần giống nhau đứng sát nhau. "First to be sighted" (được nhìn thấy đầu tiên) không đồng nghĩa với "docked first" (cập cảng đầu tiên).'),
    passage('l2-passage', 2, 'The Great Tea Race of 1866', [
      ['A', 'In May 1866, sixteen sailing ships left the Chinese port of Fuzhou, each carrying the first tea of the season to London. The first cargo to arrive would earn its owners a bonus of ten shillings per ton.'],
      ['B', 'After 99 days at sea, three ships, Ariel, Taeping and Serica, reached the English Channel within hours of each other. Ariel was the first to be sighted, but Taeping docked in London about twenty minutes earlier because it was towed up the river by a faster tugboat.'],
      ['C', 'The owners agreed to share the prize. Just three years later, the Suez Canal opened, and steamships, which could use the shorter route, soon replaced the clippers on the tea trade.'],
    ]),
    {
      id: 'l2-ex', sortOrder: 3, type: 'EXERCISE', title: 'Luyện tập: scanning', knowledgePointCode: 'KP1',
      instructions: 'Câu 4 và 6 viết một số. Câu 5 chọn đáp án đúng.',
      questions: [
        gap('q-l2-4', 4, 'How many ships took part in the race?', ['16', 'sixteen'], 'Điểm neo "sixteen sailing ships" ở câu đầu đoạn A.'),
        choice('q-l2-5', 5, 'Which ship docked in London first?', [['A', 'Ariel'], ['B', 'Taeping'], ['C', 'Serica']], 'B', 'Ariel chỉ "first to be sighted". Taeping "docked in London about twenty minutes earlier" nhờ tàu kéo nhanh hơn.'),
        gap('q-l2-6', 6, 'In what year did the Suez Canal open?', ['1869'], 'Cuộc đua năm 1866, "just three years later" → 1869.'),
      ],
    },
  ],
}

const L3: MockLesson = {
  id: 'lesson-l3',
  topicId: 'topic-demo-reading',
  title: 'Ý chính đoạn và điền từ',
  sortOrder: 3,
  estimatedMinutes: 15,
  blocks: [
    text('l3-theory', 1, 'Ý chính của đoạn thường nằm ở câu đầu, hoặc sau từ chuyển ý như However, Yet, In contrast.\n\nVới dạng điền từ:\n1. Đoán loại từ cần điền (danh từ, tính từ…).\n2. Tìm câu paraphrase trong bài.\n3. Chép đúng chính tả và không vượt giới hạn số từ.'),
    passage('l3-passage', 2, 'Gardens in the Sky', [
      ['A', 'Across many crowded cities, flat rooftops are being turned into vegetable gardens. In Montreal, a supermarket grows around 300 tonnes of produce a year on its own roof and sells it in the shop below.'],
      ['B', 'Supporters point out that green roofs also cool buildings. Soil and plants absorb heat that would otherwise pass through the roof, so less energy is needed for air conditioning in summer.'],
      ['C', 'However, not every roof is suitable. Wet soil is extremely heavy, and older buildings often need expensive structural work before a garden can be added safely.'],
    ]),
    {
      id: 'l3-ex-main', sortOrder: 3, type: 'EXERCISE', title: 'Luyện tập: ý chính đoạn', knowledgePointCode: 'KP3',
      instructions: 'Chọn đoạn (A, B hoặc C) phù hợp với mỗi mô tả.',
      questions: [
        choice('q-l3-7', 7, 'Which paragraph mainly discusses the limitations of rooftop gardens?', [['A', 'Paragraph A'], ['B', 'Paragraph B'], ['C', 'Paragraph C']], 'C', 'Đoạn C mở đầu bằng "However, not every roof is suitable" rồi nêu trọng lượng và chi phí.'),
        choice('q-l3-8', 8, 'Which paragraph mainly discusses an environmental benefit?', [['A', 'Paragraph A'], ['B', 'Paragraph B'], ['C', 'Paragraph C']], 'B', 'Đoạn B nói mái xanh làm mát tòa nhà và giảm điện điều hòa.'),
      ],
    },
    {
      id: 'l3-ex-gap', sortOrder: 4, type: 'EXERCISE', title: 'Luyện tập: điền từ', knowledgePointCode: 'KP4',
      instructions: 'Điền KHÔNG QUÁ MỘT TỪ lấy từ bài đọc.',
      questions: [
        gap('q-l3-9', 9, 'Older buildings may need costly ______ work before a garden is installed.', ['structural'], '"Expensive structural work" → "costly structural work".'),
      ],
    },
    { id: 'l3-vocab', sortOrder: 5, type: 'VOCABULARY', words: ['produce', 'absorb', 'structural'] },
  ],
}

const L4: MockLesson = {
  id: 'lesson-l4',
  topicId: 'topic-demo-reading',
  title: 'Làm quen True / False / Not Given',
  sortOrder: 4,
  estimatedMinutes: 12,
  blocks: [
    text('l4-theory', 1, 'TRUE: bài đọc khẳng định đúng ý của câu.\nFALSE: bài đọc nói điều ngược lại.\nNOT GIVEN: bài đọc không đủ thông tin để kết luận.\n\nMẹo: nếu bạn phải tự suy luận thêm điều bài không nói, đáp án thường là NOT GIVEN.'),
    { id: 'l4-audio', sortOrder: 2, type: 'ASSET', assetType: 'AUDIO', mediaUrl: '/media/tfng-intro.mp3', title: 'Nghe giảng: TRUE và NOT GIVEN' },
    passage('l4-passage', 3, 'Sleep and Memory', [
      ['A', 'Scientists have long suspected that sleep helps us remember. In one experiment, students who slept after learning a list of words recalled about 20 percent more of them the next day than students who stayed awake.'],
      ['B', 'Researchers believe that during deep sleep the brain replays recent experiences, strengthening the connections that store them. Short daytime naps appear to have a similar, though smaller, effect.'],
    ]),
    {
      id: 'l4-ex', sortOrder: 4, type: 'EXERCISE', title: 'Luyện tập: True / False / Not Given', knowledgePointCode: 'KP5',
      instructions: 'Câu sau đúng (TRUE), sai (FALSE) hay không có thông tin (NOT GIVEN)?',
      questions: [
        tfng('q-l4-10', 10, 'Students who slept after studying remembered more words than those who did not.', 'TRUE', 'Đoạn A: nhóm ngủ nhớ nhiều hơn khoảng 20%.'),
        tfng('q-l4-11', 11, "Naps are more effective than a full night's sleep.", 'FALSE', 'Đoạn B: giấc ngủ ngắn có hiệu quả "similar, though smaller", tức là kém hơn.'),
      ],
    },
  ],
}

const TFNG_1: MockLesson = {
  id: 'lesson-tfng-1',
  topicId: 'topic-tfng-skills',
  title: 'FALSE khác NOT GIVEN thế nào',
  sortOrder: 1,
  estimatedMinutes: 8,
  blocks: [
    text('tfng1-a', 1, 'FALSE nghĩa là bài đọc có thông tin MÂU THUẪN với câu hỏi.\nNOT GIVEN nghĩa là bài đọc KHÔNG NÓI tới điều đó, dù có thể nhắc tới chủ đề liên quan.'),
    text('tfng1-b', 2, 'Ví dụ: bài viết "Cửa hàng mở cửa từ năm 1990."\n• "Cửa hàng mở năm 1985." → FALSE (mâu thuẫn).\n• "Cửa hàng đông khách nhất thành phố." → NOT GIVEN (bài không nói).'),
  ],
}

const TFNG_2: MockLesson = {
  id: 'lesson-tfng-2',
  topicId: 'topic-tfng-skills',
  title: 'Từ hạn định: most, all, only',
  sortOrder: 2,
  estimatedMinutes: 12,
  blocks: [
    text('tfng2-theory', 1, 'Các từ như most, all, only, never làm câu hỏi "chặt" hơn bài đọc. Hãy so sánh mức độ, đừng chỉ so từ khóa.'),
    passage('tfng2-passage', 2, 'The Silk Road', [
      ['A', 'The Silk Road was not a single road but a network of trade routes linking China with the Mediterranean. Goods such as silk, spices and paper travelled west, while gold, glass and horses moved east.'],
      ['B', 'Few merchants travelled the entire distance. Instead, goods were passed from trader to trader, and their price rose at every stage of the journey.'],
    ]),
    {
      id: 'tfng2-ex', sortOrder: 3, type: 'EXERCISE', title: 'Luyện tập: từ hạn định', knowledgePointCode: 'KP5',
      instructions: 'Câu sau đúng (TRUE), sai (FALSE) hay không có thông tin (NOT GIVEN)?',
      questions: [
        tfng('q-tfng2-1', 1, 'The Silk Road consisted of several routes.', 'TRUE', '"A network of trade routes" → nhiều tuyến đường.'),
        tfng('q-tfng2-2', 2, 'Most merchants travelled from China to the Mediterranean.', 'FALSE', '"Few merchants travelled the entire distance" mâu thuẫn với "most".'),
        tfng('q-tfng2-3', 3, 'Silk was the most expensive item traded.', 'NOT GIVEN', 'Bài nói giá tăng dần nhưng không so sánh giá giữa các mặt hàng.'),
      ],
    },
  ],
}

const MH_1: MockLesson = {
  id: 'lesson-mh-1', topicId: 'topic-matching-headings', title: 'Đọc câu chủ đề', sortOrder: 1, estimatedMinutes: 10,
  blocks: [text('mh1-a', 1, 'Tiêu đề phù hợp phản ánh ý của cả đoạn, không chỉ một chi tiết.')],
}

const MH_2: MockLesson = {
  id: 'lesson-mh-2', topicId: 'topic-matching-headings', title: 'Bẫy từ khóa trùng', sortOrder: 2, estimatedMinutes: 10,
  blocks: [text('mh2-a', 1, 'Tiêu đề có từ trùng với đoạn văn chưa chắc là đáp án đúng.')],
}

export const MOCK_LESSONS: MockLesson[] = [L1, L2, L3, L4, TFNG_1, TFNG_2, MH_1, MH_2]
