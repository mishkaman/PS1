import assert from "assert";
import { AnswerDifficulty, Flashcard, BucketMap } from "../src/flashcards";
import {
  toBucketSets,
  getBucketRange,
  practice,
  update,
  getHint,
  computeProgress,
} from "../src/algorithm";

function createFlashcard(front: string, back: string, hint: string = '', tags: string[] = []): Flashcard {
  return new Flashcard(front, back, hint, tags);
}

describe("toBucketSets()", () => {
  it("converts empty bucket map to empty array", () => {
    const emptyBuckets: BucketMap = new Map();
    const result = toBucketSets(emptyBuckets);
    assert.deepStrictEqual(result, []);
  });

  it("converts non-contiguous bucket map correctly", () => {
    const card1 = createFlashcard("Q1", "A1");
    const card2 = createFlashcard("Q2", "A2");
    const buckets: BucketMap = new Map([
      [0, new Set([card1])],
      [2, new Set([card2])]
    ]);
    
    const result = toBucketSets(buckets);
    assert.strictEqual(result.length, 3);
    assert.ok(result[0]?.has(card1));
    assert.ok(result[2]?.has(card2));
    assert.strictEqual(result[1]?.size, 0);
  });
});

describe("getBucketRange()", () => {
  it("returns undefined for empty buckets", () => {
    const emptyBuckets: Array<Set<Flashcard>> = [];
    assert.strictEqual(getBucketRange(emptyBuckets), undefined);
  });

  it("finds correct bucket range", () => {
    const card1 = createFlashcard("Q1", "A1");
    const card2 = createFlashcard("Q2", "A2");
    const buckets: Array<Set<Flashcard>> = [
      new Set(), 
      new Set([card1]), 
      new Set(), 
      new Set([card2])
    ];
    
    const range = getBucketRange(buckets);
    assert.deepStrictEqual(range, { minBucket: 1, maxBucket: 3 });
  });
});

describe("practice()", () => {
  it("practices bucket 0 cards every day", () => {
    const card1 = createFlashcard("Q1", "A1");
    const card2 = createFlashcard("Q2", "A2");
    const buckets: Array<Set<Flashcard>> = [
      new Set([card1, card2]), 
      new Set(), 
      new Set()
    ];
    
    const practiceCards = practice(buckets, 5);
    assert.deepStrictEqual(practiceCards, new Set([card1, card2]));
  });

  it("practices higher bucket cards on specific days", () => {
    const card1 = createFlashcard("Q1", "A1");
    const card2 = createFlashcard("Q2", "A2");
    const buckets: Array<Set<Flashcard>> = [
      new Set(), 
      new Set([card1]), 
      new Set([card2])
    ];
    
    // Test day 2 should practice bucket 1 (2^1)
    const practiceCards1 = practice(buckets, 2);
    assert.deepStrictEqual(practiceCards1, new Set([card1]));

    // Test day 4 should practice bucket 2 (2^2)
    const practiceCards2 = practice(buckets, 4);
    assert.deepStrictEqual(practiceCards2, new Set([card2]));
  });
});

describe("update()", () => {
  it("moves card to correct bucket based on difficulty", () => {
    const card = createFlashcard("Q1", "A1");
    const initialBuckets: BucketMap = new Map([
      [0, new Set([card])]
    ]);

    // Test "Easy" answer (should move to bucket 2)
    const easyUpdate = update(initialBuckets, card, AnswerDifficulty.Easy);
    assert.strictEqual(easyUpdate.get(2)?.has(card), true);
    assert.strictEqual(easyUpdate.get(0)?.has(card), false);

    // Test "Hard" answer (should move to bucket 1)
    const hardUpdate = update(initialBuckets, card, AnswerDifficulty.Hard);
    assert.strictEqual(hardUpdate.get(1)?.has(card), true);
    assert.strictEqual(hardUpdate.get(0)?.has(card), false);

    // Test "Wrong" answer (should stay in bucket 0)
    const wrongUpdate = update(initialBuckets, card, AnswerDifficulty.Wrong);
    assert.strictEqual(wrongUpdate.get(0)?.has(card), true);
  });

  it("respects maximum bucket limit", () => {
    const card = createFlashcard("Q1", "A1");
    const highBuckets: BucketMap = new Map([
      [6, new Set([card])]
    ]);

    // Test "Easy" answer from bucket 6 (should move to bucket 7, not 8)
    const easyUpdate = update(highBuckets, card, AnswerDifficulty.Easy);
    assert.strictEqual(easyUpdate.get(7)?.has(card), true);
    assert.strictEqual(easyUpdate.get(8), undefined);
  });
});

describe("getHint()", () => {
  it("returns existing hint if available", () => {
    const card = createFlashcard("Question", "Answer", "Existing Hint");
    assert.strictEqual(getHint(card), "Existing Hint");
  });

  it("generates hint for short strings", () => {
    const shortCard = createFlashcard("Hi", "Hello", "");
    const hint = getHint(shortCard);
    assert.strictEqual(hint, "H*");
  });

  it("generates hint for longer strings", () => {
    const longCard = createFlashcard("Python Programming", "A coding language", "");
    const hint = getHint(longCard);
    assert.strictEqual(hint, "Pyt***************");
  });
});

// Define a type for the stage object based on what's used in the test
interface ProgressStage {
  stage: string;
  cardCount: number;
  percentage: number;
}

describe("computeProgress()", () => {
  it("calculates progress across different stages", () => {
    const card1 = createFlashcard("Q1", "A1");
    const card2 = createFlashcard("Q2", "A2");
    const card3 = createFlashcard("Q3", "A3");

    const buckets: BucketMap = new Map([
      [0, new Set([card1])],
      [2, new Set([card2])],
      [6, new Set([card3])]
    ]);

    // Create a history map
    const history: Map<Flashcard, AnswerDifficulty[]> = new Map([
      [card1, [AnswerDifficulty.Easy, AnswerDifficulty.Hard]],
      [card2, [AnswerDifficulty.Wrong]],
      [card3, [AnswerDifficulty.Easy]]
    ]);

    const progress = computeProgress(buckets, history);
    
    // Verify basic properties of the progress object
    assert.strictEqual(progress.totalCards, 3);
    assert.ok(Array.isArray(progress.stageBreakdown));
    assert.strictEqual(progress.stageBreakdown.length, 3);
    
    // Check that stage breakdowns have the right properties
    progress.stageBreakdown.forEach((stage: ProgressStage) => {
      assert.ok('stage' in stage);
      assert.ok('cardCount' in stage);
      assert.ok('percentage' in stage);
    });
  });

  it("handles empty buckets correctly", () => {
    const emptyBuckets: BucketMap = new Map();
    const emptyHistory: Map<Flashcard, AnswerDifficulty[]> = new Map();
    
    const progress = computeProgress(emptyBuckets, emptyHistory);
    assert.strictEqual(progress.totalCards, 0);
    
    // Make sure percentages don't cause division by zero errors
    progress.stageBreakdown.forEach((stage: ProgressStage) => {
      assert.strictEqual(stage.percentage, 0);
    });
  });
});