class TreeNode {
  val: number
  left: TreeNode | null
  right: TreeNode | null
  constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
    this.val = val === undefined ? 0 : val
    this.left = left === undefined ? null : left
    this.right = right === undefined ? null : right
  }
}

const node: TreeNode = {
  val: 0,
  left: {
    val: 1,
    left: {
      val: 2,
      left: null,
      right: null
    },
    right: null
  },
  right: {
    val: 1,
    left: null,
    right: {
      val: 2,
      left: null,
      right: {
        val: 111,
        left: null,
        right: null
      }
    }
  }
}

function sortedArrayToBST(nums: number[]): TreeNode | null {
    
};