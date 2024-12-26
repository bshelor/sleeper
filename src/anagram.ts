/**
 * Return true if any vowels exist in the word.
 * @param word 
 * @returns 
 */
const anyVowels = (word: string): boolean => {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  for (const letter of word) {
    if (vowels.includes(letter)) { return true; }
  }
  return false;
}

/**
 * Return true if MIN_LENGTH or longer
 * @param word 
 */
const validateLength = (word: string): boolean => {
  const MIN_LENGTH = 2;
  return word.length >= MIN_LENGTH;
};

/**
 * Return true if all conditions pass.
 * @param word 
 * @returns 
 */
const filter = (word: string): boolean => {
  const conditions = [validateLength, anyVowels];
  return conditions.every((fn) => fn(word));
};

/**
 * A script to create anagram options for a given word.
 */
const main = (word: string) => {
  const words: string[] = [];
  for (let i = 0; i < word.length; i++) {
    for (let x = i; x < word.length; x++) {
      const slice = word.slice(i, x + 1);
      if (filter(slice)) { words.push(slice); } // do some prefiltering on word options
    }
  }
  return words;
};

const res = main('steelers');
console.log("🚀 ~ file: anagram.ts:15 ~ res:", res)
