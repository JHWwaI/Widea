import sys
f= [0]*40
count_fib_recursive = 0
count_fib_dynamic = 0   

def fib(n):
    global count_fib_recursive
    if(n == 1 or n == 2):
        count_fib_recursive += 1
        return 1 
    else:
        return fib(n-1) + fib(n-2)
    
def fib_dynamic(n):
    f[1] = f[2] =1
    global count_fib_dynamic
    for i in range(3,n+1):
        f[i] = f[i-1] + f[i-2]
        count_fib_dynamic += 1
    return f[n]

n =int(sys.stdin.readline())

fib(n)
fib_dynamic(n)
print(count_fib_recursive, count_fib_dynamic)