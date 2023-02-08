package code;

import java.util.ArrayList;
import java.util.List;

public class Solution2 {
    public List<String> generateParenthesis(int n) {
        List<String> combinations = new ArrayList<String>();
        generateAll(new char[n], 0, combinations);
        return combinations;
    }

    public void generateAll(char[] current, int pos, List<String> result) {
        if (pos == current.length) {
            result.add(new String(current));
        } else {
            current[pos] = '0';
            generateAll(current, pos + 1, result);
            current[pos] = '1';
            generateAll(current, pos + 1, result);
        }
    }
}
