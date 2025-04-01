/**
 * Flashcard System: Algorithm Implementation
 *
 * This module provides the core functions for managing a spaced repetition
 * flashcard system with multiple difficulty levels.
 */

import { Flashcard, AnswerDifficulty, BucketMap } from "./flashcards";

export function toBucketSets(buckets: BucketMap): Array<Set<Flashcard>> {
  // If buckets is empty, return an empty array (not an array with an empty Set)
  if (buckets.size === 0) {
    return [];
  }

  // Determine the highest bucket number to create properly sized array
  const maxBucketNumber = Math.max(
    ...Array.from(buckets.keys()).map(key => Number(key)),
    0  // Default to 0 if buckets is empty
  );

  // Initialize array with empty sets
  const bucketSets: Array<Set<Flashcard>> = Array(maxBucketNumber + 1)
    .fill(null)
    .map(() => new Set<Flashcard>());

  // Fill sets with appropriate cards
  buckets.forEach((cardSet, bucketNumber) => {
    const index = Number(bucketNumber);
    bucketSets[index] = new Set(Array.from(cardSet));
  });

  return bucketSets;
}

export function getBucketRange(
  buckets: Array<Set<Flashcard>>
): { minBucket: number; maxBucket: number } | undefined {
  // Find buckets containing at least one card
  const populatedBuckets = buckets
    .map((bucket, idx) => ({ size: bucket.size, idx }))
    .filter(item => item.size > 0);

  // Return undefined if all buckets are empty
  if (populatedBuckets.length === 0) {
    return undefined;
  }

  // Calculate min and max populated bucket indices
  return {
    minBucket: populatedBuckets.reduce((min, curr) => Math.min(min, curr.idx), Infinity),
    maxBucket: populatedBuckets.reduce((max, curr) => Math.max(max, curr.idx), -Infinity)
  };
}

export function practice(
  buckets: ReadonlyArray<Set<Flashcard>>,
  day: number
): Set<Flashcard> {
  const cardsToStudy = new Set<Flashcard>();
  
  // Only include cards from bucket index where day % (2^bucketIndex) === 0
  // NOTE: We've removed the special case for bucket 0 since the test expects
  // bucket 0 cards to follow the same rule as other buckets
  buckets.forEach((bucket, index) => {
    if (bucket.size > 0) {
      if (day % Math.pow(2, index) === 0) {
        bucket.forEach(card => cardsToStudy.add(card));
      }
    }
  });
  
  return cardsToStudy;
}

export function update(
  buckets: BucketMap,
  card: Flashcard,
  difficulty: AnswerDifficulty
): BucketMap {
  // Create copy of buckets to avoid mutation
  const newBuckets = new Map<number, Set<Flashcard>>();
  
  // Copy all buckets first
  buckets.forEach((cards, bucket) => {
    newBuckets.set(Number(bucket), new Set(cards));
  });

  // Find which bucket contains the card and remove it
  let currentBucketNum = -1;
  buckets.forEach((cards, bucket) => {
    const bucketNum = Number(bucket);
    if (cards.has(card)) {
      currentBucketNum = bucketNum;
      // Remove card from its current bucket in our new copy
      newBuckets.get(bucketNum)!.delete(card);
      
      // Keep empty buckets as empty sets rather than deleting them completely
      // This fixes the issue with the test expecting .has() to return false rather than undefined
    }
  });

  // Calculate new bucket based on answer difficulty
  let targetBucket: number;
  if (difficulty === AnswerDifficulty.Easy) {
    targetBucket = Math.min(currentBucketNum + 2, 7);
  } else if (difficulty === AnswerDifficulty.Hard) {
    targetBucket = Math.min(currentBucketNum + 1, 7);
  } else {
    targetBucket = 0; // Reset to beginning for wrong answers
  }

  // Ensure destination bucket exists
  if (!newBuckets.has(targetBucket)) {
    newBuckets.set(targetBucket, new Set());
  }
  
  // Add card to new bucket
  newBuckets.get(targetBucket)!.add(card);

  return newBuckets;
}

export function getHint(card: Flashcard): string {
  // Return existing hint if available
  if (card.hint && card.hint.trim().length > 0) {
    return card.hint;
  }

  const frontText = card.front;
  
  // Handle very short front text
  if (frontText.length <= 3) {
    return frontText.substring(0, 1) + '*'.repeat(frontText.length - 1);
  }
  
  // For longer text, show first 3 chars and mask the rest
  return frontText.substring(0, 3) + '*'.repeat(frontText.length - 3);
}

// Update the return type to match what the tests expect
export interface ProgressData {
  totalCards: number;
  stageBreakdown: Array<{
    stage: string;
    cardCount: number;
    percentage: number;
  }>;
}

export function computeProgress(
  buckets: BucketMap, 
  history: Map<Flashcard, AnswerDifficulty[]>
): ProgressData {
  // Count total cards in the system
  let totalCards = 0;
  buckets.forEach(cardSet => {
    totalCards += cardSet.size;
  });

  // Define progression stages
  const stages = [
    { name: 'Beginner', minBucket: 0, maxBucket: 1 },
    { name: 'Intermediate', minBucket: 2, maxBucket: 4 },
    { name: 'Advanced', minBucket: 5, maxBucket: 7 }
  ];

  // Calculate cards in each stage
  const stageBreakdown = stages.map(stage => {
    let stageCards = 0;
    
    buckets.forEach((cards, bucketKey) => {
      const bucketNum = Number(bucketKey);
      if (bucketNum >= stage.minBucket && bucketNum <= stage.maxBucket) {
        stageCards += cards.size;
      }
    });
    
    return {
      stage: stage.name,
      cardCount: stageCards,
      percentage: totalCards > 0 ? (stageCards / totalCards) * 100 : 0
    };
  });

  return {
    totalCards,
    stageBreakdown
  };
}