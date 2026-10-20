const CodingProblem = require('../models/CodingProblem');

const initialProblems = [
  {
    title: 'Target Sum Indices',
    slug: 'target-sum-indices',
    order: 1,
    difficulty: 'Easy',
    topics: ['Arrays', 'Hashing', 'Two Pointers'],
    targetRoles: ['Backend Developer', 'Full Stack Developer', 'Software Engineer', 'Data Engineer'],
    acceptanceRate: 88.4,
    description: `Given an integer array \`nums\` and an integer \`target\`, return the **indices** of the two numbers such that they add up to \`target\`.

You may assume that each input has **exactly one solution**, and you may not use the same element twice. You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2, 7, 11, 15], target = 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3, 2, 4], target = 6',
        output: '[1, 2]',
        explanation: 'Because nums[1] + nums[2] == 2 + 4 == 6, we return [1, 2].',
      },
      {
        input: 'nums = [3, 3], target = 6',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 3 + 3 == 6, we return [0, 1].',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    functionName: 'twoSum',
    returnType: 'array',
    sampleTestCases: [
      { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]', explanation: 'Standard pair at beginning' },
      { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]', explanation: 'Pair in middle' },
      { input: '[3, 3], 6', expectedOutput: '[0, 1]', explanation: 'Duplicate elements' },
    ],
    hiddenTestCases: [
      { input: '[-1, -2, -3, -4, -5], -8', expectedOutput: '[2, 4]' },
      { input: '[0, 4, 3, 0], 0', expectedOutput: '[0, 3]' },
      { input: '[100, 200, 300, 400], 700', expectedOutput: '[2, 3]' },
      { input: '[1, 5, 8, 12, 19, 25], 33', expectedOutput: '[2, 5]' },
    ],
    starterTemplates: {
      python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Write your solution here
}
`,
      java: `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
        return {};
    }
};
`,
    },
    hints: [
      'A brute-force search checking all pairs takes O(n^2) time. Can we do better with auxiliary memory?',
      'As you iterate through the array, can you check if the complement (target - current_number) has already been seen in a hash map in O(1) time?',
      'Store each number as a key in a hash map mapping to its index. When (target - nums[i]) is in the map, return [map[target - nums[i]], i].',
    ],
    conceptExplanation: `This problem demonstrates the classic **Time-Space Tradeoff** using a **Hash Map / Dictionary**.
By storing previously seen elements in a hash map with their indices, we can look up whether the required complement \`target - nums[i]\` exists in O(1) average time, reducing the runtime from O(n²) to O(n).`,
    timeComplexity: 'O(n) where n is the number of elements in nums.',
    spaceComplexity: 'O(n) to store seen elements in the hash map.',
    isRecommended: true,
  },
  {
    title: 'Balanced Brackets & Delimiters',
    slug: 'balanced-brackets-delimiters',
    order: 2,
    difficulty: 'Easy',
    topics: ['Stack', 'Strings'],
    targetRoles: ['Backend Developer', 'Full Stack Developer', 'Software Engineer'],
    acceptanceRate: 82.1,
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is **valid**.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      { input: 's = "()"', output: 'true', explanation: 'Simple matching parentheses.' },
      { input: 's = "()[]{}"', output: 'true', explanation: 'Multiple valid pairs in sequence.' },
      { input: 's = "(]"', output: 'false', explanation: 'Mismatched closing bracket.' },
      { input: 's = "([)]"', output: 'false', explanation: 'Interleaved invalid nesting.' },
      { input: 's = "{[]}"', output: 'true', explanation: 'Valid deeply nested brackets.' },
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only \'()[]{}\'',
    ],
    functionName: 'isValid',
    returnType: 'boolean',
    sampleTestCases: [
      { input: '"()"', expectedOutput: 'true', explanation: 'Base single pair' },
      { input: '"()[]{}"', expectedOutput: 'true', explanation: 'Consecutive pairs' },
      { input: '"(]"', expectedOutput: 'false', explanation: 'Mismatched brackets' },
    ],
    hiddenTestCases: [
      { input: '"{[]}"', expectedOutput: 'true' },
      { input: '"([)]"', expectedOutput: 'false' },
      { input: '"["', expectedOutput: 'false' },
      { input: '"]"', expectedOutput: 'false' },
      { input: '"{[()()][{}]}"', expectedOutput: 'true' },
    ],
    starterTemplates: {
      python: `class Solution:
    def isValid(self, s: str) -> bool:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Write your solution here
}
`,
      java: `import java.util.*;

class Solution {
    public boolean isValid(String s) {
        // Write your solution here
        return false;
    }
}
`,
      cpp: `#include <string>
#include <stack>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        // Write your solution here
        return false;
    }
};
`,
    },
    hints: [
      'Think about the Last-In First-Out (LIFO) property. The most recently opened bracket must be the first one closed.',
      'Use a Stack to push opening brackets. When a closing bracket arrives, verify the stack top matches.',
      'Remember to handle edge cases like remaining unclosed brackets in the stack or encountering a closing bracket with an empty stack.',
    ],
    conceptExplanation: `This problem illustrates the **Stack (LIFO)** data structure.
Whenever you see nested structures (HTML tags, JSON tokens, arithmetic parenthesis), a Stack is the ideal data structure to enforce correct scoping and delimiter pairing.`,
    timeComplexity: 'O(n) where n is the length of string s.',
    spaceComplexity: 'O(n) in worst case when all characters are opening brackets.',
    isRecommended: true,
  },
  {
    title: 'Longest Non-Repeating Substring',
    slug: 'longest-non-repeating-substring',
    order: 3,
    difficulty: 'Medium',
    topics: ['Strings', 'Sliding Window', 'Hashing'],
    targetRoles: ['Backend Developer', 'Frontend Developer', 'Full Stack Developer'],
    acceptanceRate: 71.3,
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.

A substring is a contiguous non-empty sequence of characters within a string.`,
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", with the length of 1.' },
      { input: 's = "pwwkew"', output: '3', explanation: 'The answer is "wke", with the length of 3.' },
    ],
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.',
    ],
    functionName: 'lengthOfLongestSubstring',
    returnType: 'number',
    sampleTestCases: [
      { input: '"abcabcbb"', expectedOutput: '3', explanation: '"abc" has length 3' },
      { input: '"bbbbb"', expectedOutput: '1', explanation: '"b" has length 1' },
      { input: '"pwwkew"', expectedOutput: '3', explanation: '"wke" has length 3' },
    ],
    hiddenTestCases: [
      { input: '""', expectedOutput: '0' },
      { input: '" "', expectedOutput: '1' },
      { input: '"au"', expectedOutput: '2' },
      { input: '"dvdf"', expectedOutput: '3' },
      { input: '"tmmzuxt"', expectedOutput: '5' },
    ],
    starterTemplates: {
      python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  // Write your solution here
}
`,
      java: `import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Write your solution here
        return 0;
    }
}
`,
      cpp: `#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Write your solution here
        return 0;
    }
};
`,
    },
    hints: [
      'Instead of re-evaluating every substring with nested loops, use a dynamic Sliding Window [left, right].',
      'Maintain a map of each character to its most recent index.',
      'When character s[right] has already been seen in the current window, move the left pointer past its previous index.',
    ],
    conceptExplanation: `This problem is the quintessential **Variable-size Sliding Window** algorithmic pattern.
By maintaining left and right pointers and tracking character frequency or last-seen index in a Hash Table, the window expands rightward and contracts from the left only when a duplicate occurs, ensuring every character is processed at most twice.`,
    timeComplexity: 'O(n) where n is the length of string s.',
    spaceComplexity: 'O(min(n, m)) where m is the alphabet/character set size.',
    isRecommended: true,
  },
  {
    title: 'Merge Sorted Array Buffers',
    slug: 'merge-sorted-array-buffers',
    order: 4,
    difficulty: 'Easy',
    topics: ['Arrays', 'Two Pointers', 'Sorting'],
    targetRoles: ['Backend Developer', 'Data Engineer', 'Software Engineer'],
    acceptanceRate: 85.0,
    description: `You are given two integer arrays \`nums1\` and \`nums2\`, sorted in **non-decreasing order**, and two integers \`m\` and \`n\`, representing the number of valid elements in \`nums1\` and \`nums2\` respectively.

Merge \`nums1\` and \`nums2\` into a single sorted array.

The function should return the merged sorted array containing all \`m + n\` elements.`,
    examples: [
      {
        input: 'nums1 = [1, 2, 3, 0, 0, 0], m = 3, nums2 = [2, 5, 6], n = 3',
        output: '[1, 2, 2, 3, 5, 6]',
        explanation: 'The arrays we are merging are [1, 2, 3] and [2, 5, 6].',
      },
      {
        input: 'nums1 = [1], m = 1, nums2 = [], n = 0',
        output: '[1]',
        explanation: 'The result is [1].',
      },
    ],
    constraints: [
      'nums1.length == m + n',
      'nums2.length == n',
      '0 <= m, n <= 200',
      '1 <= m + n <= 200',
    ],
    functionName: 'merge',
    returnType: 'array',
    sampleTestCases: [
      { input: '[1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3', expectedOutput: '[1, 2, 2, 3, 5, 6]' },
      { input: '[1], 1, [], 0', expectedOutput: '[1]' },
      { input: '[0], 0, [1], 1', expectedOutput: '[1]' },
    ],
    hiddenTestCases: [
      { input: '[4, 5, 6, 0, 0, 0], 3, [1, 2, 3], 3', expectedOutput: '[1, 2, 3, 4, 5, 6]' },
      { input: '[2, 0], 1, [1], 1', expectedOutput: '[1, 2]' },
      { input: '[-5, -2, 0, 0, 0], 2, [-4, -3, 1], 3', expectedOutput: '[-5, -4, -3, -2, 1]' },
    ],
    starterTemplates: {
      python: `class Solution:
    def merge(self, nums1: list[int], m: int, nums2: list[int], n: int) -> list[int]:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {number[]} nums1
 * @param {number} m
 * @param {number[]} nums2
 * @param {number} n
 * @return {number[]}
 */
function merge(nums1, m, nums2, n) {
  // Write your solution here
}
`,
      java: `import java.util.*;

class Solution {
    public int[] merge(int[] nums1, int m, int[] nums2, int n) {
        // Write your solution here
        return nums1;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {
        // Write your solution here
        return nums1;
    }
};
`,
    },
    hints: [
      'Notice that nums1 has empty buffer space at the end to hold all m + n elements.',
      'If you merge from the beginning, you will overwrite elements in nums1. Can you merge backwards from the end?',
      'Use three pointers: p1 at m - 1, p2 at n - 1, and p at m + n - 1.',
    ],
    conceptExplanation: `This problem teaches **Reverse Two Pointers**.
By iterating backwards from the largest elements, we take advantage of the unused buffer space at the tail of the array, achieving in-place O(1) extra memory without overwriting unvisited values.`,
    timeComplexity: 'O(m + n)',
    spaceComplexity: 'O(1) extra space.',
    isRecommended: false,
  },
  {
    title: 'Maximum Subarray Segment (Kadane\'s)',
    slug: 'maximum-subarray-segment',
    order: 5,
    difficulty: 'Medium',
    topics: ['Arrays', 'Dynamic Programming'],
    targetRoles: ['Backend Developer', 'Software Engineer', 'Data Engineer'],
    acceptanceRate: 77.8,
    description: `Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) which has the **largest sum** and return *its sum*.

A subarray is a contiguous part of an array.`,
    examples: [
      {
        input: 'nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]',
        output: '6',
        explanation: 'The contiguous subarray [4, -1, 2, 1] has the largest sum = 6.',
      },
      { input: 'nums = [1]', output: '1', explanation: 'Single element subarray has sum = 1.' },
      { input: 'nums = [5, 4, -1, 7, 8]', output: '23', explanation: 'The subarray [5, 4, -1, 7, 8] has the largest sum = 23.' },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
    ],
    functionName: 'maxSubArray',
    returnType: 'number',
    sampleTestCases: [
      { input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', expectedOutput: '6' },
      { input: '[1]', expectedOutput: '1' },
      { input: '[5, 4, -1, 7, 8]', expectedOutput: '23' },
    ],
    hiddenTestCases: [
      { input: '[-1]', expectedOutput: '-1' },
      { input: '[-2, -1]', expectedOutput: '-1' },
      { input: '[-5, -4, -3, -2, -1]', expectedOutput: '-1' },
      { input: '[8, -19, 5, -4, 20]', expectedOutput: '21' },
    ],
    starterTemplates: {
      python: `class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  // Write your solution here
}
`,
      java: `class Solution {
    public int maxSubArray(int[] nums) {
        // Write your solution here
        return 0;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Write your solution here
        return 0;
    }
};
`,
    },
    hints: [
      'If the sum of a prefix subarray is negative, it will only decrease any subsequent subarray sum.',
      'At each index i, decide whether to append nums[i] to the existing running sum, or start a fresh subarray at nums[i].',
      'Keep track of the global maximum sum seen so far.',
    ],
    conceptExplanation: `This problem demonstrates **Kadane's Algorithm**, an elegant 1D Dynamic Programming technique.
The recurrence relation is: \`current_max = max(nums[i], current_max + nums[i])\`.
This computes the optimal contiguous segment in a single linear pass with O(1) state space.`,
    timeComplexity: 'O(n) single pass.',
    spaceComplexity: 'O(1) auxiliary space.',
    isRecommended: true,
  },
  {
    title: 'Container With Most Water',
    slug: 'container-with-most-water',
    order: 6,
    difficulty: 'Medium',
    topics: ['Arrays', 'Two Pointers', 'Greedy'],
    targetRoles: ['Frontend Developer', 'Full Stack Developer', 'Software Engineer'],
    acceptanceRate: 74.2,
    description: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i-th\` line are \`(i, 0)\` and \`(i, height[i])\`.

Find two lines that together with the x-axis form a container, such that the container contains the **most water**.

Return *the maximum amount of water a container can store*.`,
    examples: [
      {
        input: 'height = [1, 8, 6, 2, 5, 4, 8, 3, 7]',
        output: '49',
        explanation: 'The max area is between index 1 (height 8) and index 8 (height 7): min(8, 7) * (8 - 1) = 49.',
      },
      { input: 'height = [1, 1]', output: '1', explanation: 'Area = min(1, 1) * (1 - 0) = 1.' },
    ],
    constraints: [
      'n == height.length',
      '2 <= n <= 10^5',
      '0 <= height[i] <= 10^4',
    ],
    functionName: 'maxArea',
    returnType: 'number',
    sampleTestCases: [
      { input: '[1, 8, 6, 2, 5, 4, 8, 3, 7]', expectedOutput: '49' },
      { input: '[1, 1]', expectedOutput: '1' },
    ],
    hiddenTestCases: [
      { input: '[4, 3, 2, 1, 4]', expectedOutput: '16' },
      { input: '[1, 2, 1]', expectedOutput: '2' },
      { input: '[1, 2, 4, 3]', expectedOutput: '4' },
      { input: '[6, 9, 3, 4, 5, 8]', expectedOutput: '32' },
    ],
    starterTemplates: {
      python: `class Solution:
    def maxArea(self, height: list[int]) -> int:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {number[]} height
 * @return {number}
 */
function maxArea(height) {
  // Write your solution here
}
`,
      java: `class Solution {
    public int maxArea(int[] height) {
        // Write your solution here
        return 0;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        // Write your solution here
        return 0;
    }
};
`,
    },
    hints: [
      'The area is limited by the shorter line: area = min(height[left], height[right]) * (right - left).',
      'Start with the widest container: left = 0, right = n - 1.',
      'To increase area, moving the taller pointer cannot help (width shrinks, height cannot exceed shorter). Move the shorter pointer inward!',
    ],
    conceptExplanation: `This problem uses the **Two Pointers Greedy Shrinking Window** technique.
By initializing pointers at opposite ends, the width is maximized initially. In each step, discarding the shorter boundary is provably optimal because any container formed with that shorter boundary and an interior line would have both smaller width and equal or smaller height.`,
    timeComplexity: 'O(n) two-pointer pass.',
    spaceComplexity: 'O(1) constant auxiliary space.',
    isRecommended: false,
  },
  {
    title: 'Rotated Sorted Array Search',
    slug: 'rotated-sorted-array-search',
    order: 7,
    difficulty: 'Medium',
    topics: ['Binary Search', 'Arrays'],
    targetRoles: ['Backend Developer', 'Software Engineer'],
    acceptanceRate: 69.5,
    description: `There is an integer array \`nums\` sorted in ascending order (with distinct values).

Prior to being passed to your function, \`nums\` is possibly rotated at an unknown pivot index. For example, \`[0, 1, 2, 4, 5, 6, 7]\` might be rotated at pivot index 3 and become \`[4, 5, 6, 7, 0, 1, 2]\`.

Given the array \`nums\` after the possible rotation and an integer \`target\`, return the index of \`target\` if it is in \`nums\`, or \`-1\` if it is not in \`nums\`.

You must write an algorithm with **O(log n)** runtime complexity.`,
    examples: [
      { input: 'nums = [4, 5, 6, 7, 0, 1, 2], target = 0', output: '4' },
      { input: 'nums = [4, 5, 6, 7, 0, 1, 2], target = 3', output: '-1' },
      { input: 'nums = [1], target = 0', output: '-1' },
    ],
    constraints: [
      '1 <= nums.length <= 5000',
      '-10^4 <= nums[i] <= 10^4',
      'All values of nums are unique.',
      'nums is guaranteed to be rotated at some pivot.',
    ],
    functionName: 'search',
    returnType: 'number',
    sampleTestCases: [
      { input: '[4, 5, 6, 7, 0, 1, 2], 0', expectedOutput: '4' },
      { input: '[4, 5, 6, 7, 0, 1, 2], 3', expectedOutput: '-1' },
      { input: '[1], 0', expectedOutput: '-1' },
    ],
    hiddenTestCases: [
      { input: '[1, 3], 3', expectedOutput: '1' },
      { input: '[3, 1], 1', expectedOutput: '1' },
      { input: '[5, 1, 3], 5', expectedOutput: '0' },
      { input: '[4, 5, 6, 7, 8, 1, 2, 3], 8', expectedOutput: '4' },
    ],
    starterTemplates: {
      python: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
  // Write your solution here
}
`,
      java: `class Solution {
    public int search(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}
`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int search(vector<int>& nums, int target) {
        // Write your solution here
        return -1;
    }
};
`,
    },
    hints: [
      'Even though the array is rotated, when you divide the array in half at mid, at least one half is always strictly sorted.',
      'Check if the left half nums[low] <= nums[mid] is sorted. If it is, determine if target falls within [nums[low], nums[mid]].',
      'If target is in the sorted half, search there. Otherwise, search the other half.',
    ],
    conceptExplanation: `This problem is a prime example of **Modified Binary Search**.
At every iteration, calculating the midpoint divides the array into two halves where at least one half is guaranteed to be monotonically sorted. We can check whether the target lies inside the sorted half in O(1) time and eliminate half of the search space.`,
    timeComplexity: 'O(log n) logarithmic search.',
    spaceComplexity: 'O(1) constant auxiliary space.',
    isRecommended: true,
  },
  {
    title: 'Coin Change Optimization',
    slug: 'coin-change-optimization',
    order: 8,
    difficulty: 'Medium',
    topics: ['Dynamic Programming', 'BFS'],
    targetRoles: ['Backend Developer', 'Software Engineer', 'Full Stack Developer'],
    acceptanceRate: 64.7,
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the **fewest number of coins** that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

You may assume that you have an infinite number of each kind of coin.`,
    examples: [
      { input: 'coins = [1, 2, 5], amount = 11', output: '3', explanation: '11 = 5 + 5 + 1 (3 coins)' },
      { input: 'coins = [2], amount = 3', output: '-1', explanation: 'Amount 3 cannot be formed with only 2-cent coins.' },
      { input: 'coins = [1], amount = 0', output: '0', explanation: '0 amount requires 0 coins.' },
    ],
    constraints: [
      '1 <= coins.length <= 12',
      '1 <= coins[i] <= 2^31 - 1',
      '0 <= amount <= 10^4',
    ],
    functionName: 'coinChange',
    returnType: 'number',
    sampleTestCases: [
      { input: '[1, 2, 5], 11', expectedOutput: '3' },
      { input: '[2], 3', expectedOutput: '-1' },
      { input: '[1], 0', expectedOutput: '0' },
    ],
    hiddenTestCases: [
      { input: '[1], 1', expectedOutput: '1' },
      { input: '[1], 2', expectedOutput: '2' },
      { input: '[2, 5, 10, 1], 27', expectedOutput: '4' },
      { input: '[186, 419, 83, 408], 6249', expectedOutput: '20' },
    ],
    starterTemplates: {
      python: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        # Write your solution here
        pass
`,
      javascript: `/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
function coinChange(coins, amount) {
  // Write your solution here
}
`,
      java: `import java.util.*;

class Solution {
    public int coinChange(int[] coins, int amount) {
        // Write your solution here
        return -1;
    }
}
`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        // Write your solution here
        return -1;
    }
};
`,
    },
    hints: [
      'Notice greedy approaches (taking the largest coin first) fail for denominations like [1, 3, 4] and amount 6 (greedy takes 4+1+1=3 coins, but 3+3=2 coins).',
      'Use bottom-up dynamic programming. Let dp[i] be the minimum coins to make amount i.',
      'The transition is dp[i] = min(dp[i], dp[i - coin] + 1) for each coin in coins where i >= coin.',
    ],
    conceptExplanation: `This problem exemplifies the **Unbounded Knapsack / Minimum Cost DP** pattern.
Because coin denominations can be reused indefinitely, a 1D DP table where \`dp[a]\` represents the minimum coins for amount \`a\` allows optimal subproblem reuse.`,
    timeComplexity: 'O(amount * coins.length)',
    spaceComplexity: 'O(amount) for the DP table.',
    isRecommended: true,
  },
];

async function seedCodingProblems() {
  try {
    for (const prob of initialProblems) {
      await CodingProblem.findOneAndUpdate({ slug: prob.slug }, prob, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
    }
    console.log(`[Seed] Seeded ${initialProblems.length} coding problems successfully.`);
  } catch (err) {
    console.error('[Seed] Error seeding coding problems:', err.message);
  }
}

module.exports = { initialProblems, seedCodingProblems };
