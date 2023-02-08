import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;

    TreeNode() {
    }

    TreeNode(int val) {
        this.val = val;
    }

    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }

}

/**
 * test
 */
public class test {

    public List<List<Integer>> levelOrder(TreeNode root) {
        // 边界条件判断
        if (root == null)
            return new ArrayList<>();
        // 队列
        Queue<TreeNode> queue = new LinkedList<>();
        List<List<Integer>> res = new ArrayList<>();
        // 根节点入队
        queue.add(root);
        // 如果队列不为空就继续循环
        while (!queue.isEmpty()) {
            // BFS打印，levelNum表示的是每层的结点数
            int levelNum = queue.size();
            // subList存储的是每层的结点值
            List<Integer> subList = new ArrayList<>();
            for (int i = 0; i < levelNum; i++) {
                // 出队
                TreeNode node = queue.poll();
                subList.add(node.val);
                // 左右子节点如果不为空就加入到队列中
                if (node.left != null)
                    queue.add(node.left);
                if (node.right != null)
                    queue.add(node.right);
            }
            // 把每层的结点值存储在res中，
            res.add(subList);
        }
        return res;
    }

}