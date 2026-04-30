
import sys

def find_unmatched(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char in '({[':
                stack.append((char, i+1, j+1))
            elif char in ')}]':
                if not stack:
                    print(f"Extra closing {char} at line {i+1}, col {j+1}")
                    continue
                
                opening, oi, oj = stack.pop()
                if (opening == '(' and char != ')') or \
                   (opening == '{' and char != '}') or \
                   (opening == '[' and char != ']'):
                    print(f"Mismatched {char} at line {i+1}, col {j+1} (matches {opening} at line {oi}, col {oj})")
    
    for char, i, j in stack:
        print(f"Unclosed {char} at line {i}, col {j}")

if __name__ == "__main__":
    find_unmatched(sys.argv[1])
