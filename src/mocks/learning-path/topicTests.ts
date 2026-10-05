import { choice, gap, tfng, toPassage, type MockTestPackage } from './contentTypes'

const TFNG_INSTRUCTIONS = 'Câu 13: TRUE, FALSE hay NOT GIVEN? Câu 12 chọn đáp án đúng.'
const SECOND_INSTRUCTIONS = 'Câu 14 điền KHÔNG QUÁ MỘT TỪ. Câu 15: TRUE, FALSE hay NOT GIVEN?'

export const MOCK_TEST_PACKAGES: MockTestPackage[] = [
  {
    code: 'X1',
    packageVersionId: 'pkgv-demo-reading-x1',
    topicId: 'topic-demo-reading',
    sections: [
      {
        id: 'x1-s1',
        title: 'Section 1',
        instructions: TFNG_INSTRUCTIONS,
        passage: toPassage('Coffee Houses of London', [
          ['A', 'The first coffee house in London opened in 1652. Within fifty years there were several hundred, and they became known as "penny universities" because, for the price of a cup, customers could listen to discussions on science, politics and business.'],
          ['B', "Some coffee houses developed into important institutions. Lloyd's of London, now one of the world's largest insurance markets, began in a coffee house where ship owners met to arrange cover for their voyages."],
        ]),
        questions: [
          choice('x1-q12', 12, "Why were coffee houses called 'penny universities'?", [['A', 'They were owned by universities.'], ['B', 'Customers could learn from conversations for the cost of a drink.'], ['C', 'Students received free coffee.']], 'B', '"For the price of a cup, customers could listen to discussions" → học hỏi với giá một cốc cà phê.'),
          tfng('x1-q13', 13, "Lloyd's of London started as a meeting place for ship owners.", 'TRUE', '"Began in a coffee house where ship owners met".'),
        ],
      },
      {
        id: 'x1-s2',
        title: 'Section 2',
        instructions: SECOND_INSTRUCTIONS,
        passage: toPassage('Life in the Lighthouse', [
          ['A', 'Before automation, every lighthouse needed keepers who lived on site. Their main duty was to keep the lamp burning from sunset to sunrise, which meant trimming the wick and refilling the oil several times each night.'],
          ['B', 'Keepers usually worked in teams of three, so that one could rest while the others watched the light. Supplies were delivered by boat, and in bad weather a team could be cut off for weeks.'],
        ]),
        questions: [
          gap('x1-q14', 14, 'Keepers had to refill the ______ several times a night.', ['oil'], '"Refilling the oil several times each night".'),
          tfng('x1-q15', 15, 'Most lighthouse keepers enjoyed the isolation of the job.', 'NOT GIVEN', 'Bài nói đội có thể bị cô lập nhiều tuần, nhưng không nói người gác đèn có thích điều đó hay không.'),
        ],
      },
    ],
  },
  {
    code: 'X2',
    packageVersionId: 'pkgv-demo-reading-x2',
    topicId: 'topic-demo-reading',
    sections: [
      {
        id: 'x2-s1',
        title: 'Section 1',
        instructions: TFNG_INSTRUCTIONS,
        passage: toPassage('The Story of Glass', [
          ['A', 'Glass was first made in Mesopotamia around 3,500 years ago, probably by accident when sand was heated with plant ash. For centuries it was so rare that small glass beads were traded like jewels.'],
          ['B', 'The invention of glassblowing in the first century BC changed this. Craftsmen could now produce cups and bottles quickly, and glass became an everyday material across the Roman Empire.'],
        ]),
        questions: [
          choice('x2-q12', 12, 'What made glass an everyday material?', [['A', 'the trade in glass beads'], ['B', 'the invention of glassblowing'], ['C', 'new sources of sand']], 'B', '"The invention of glassblowing… glass became an everyday material".'),
          tfng('x2-q13', 13, 'Early glass beads were highly valued.', 'TRUE', '"Traded like jewels".'),
        ],
      },
      {
        id: 'x2-s2',
        title: 'Section 2',
        instructions: SECOND_INSTRUCTIONS,
        passage: toPassage('Paper Money', [
          ['A', 'Paper money first appeared in China during the Tang dynasty, when merchants left heavy coins with trusted dealers and received written receipts instead. By the eleventh century, the government had taken over printing notes.'],
          ['B', 'When Marco Polo described Chinese paper currency, many Europeans did not believe him. Banknotes were not widely used in Europe until the seventeenth century.'],
        ]),
        questions: [
          gap('x2-q14', 14, 'Merchants received written ______ in exchange for their coins.', ['receipts', 'receipt'], '"Received written receipts instead".'),
          tfng('x2-q15', 15, 'Marco Polo brought Chinese banknotes back to Europe.', 'NOT GIVEN', 'Bài chỉ nói Marco Polo mô tả tiền giấy, không nói ông mang về.'),
        ],
      },
    ],
  },
]
