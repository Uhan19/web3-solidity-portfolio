https://github.com/0xMacro/student.Uhan19/tree/5e554c34a33052727416ee847d2afbeec8c01f98/crowdfund

Audited By: Melville

# General Comments

Well done Yuehan, you corrected all of the issues in your original submission. Your code is readable, well-documented, and correct!

I added 1 code quality pertaining to custom errors. field-rich events are going to be very useful for offchain clients who want to read information about your clients, most particularly your project's own frontend engineers.

You've done really well in the Fellowship, and I'm excited to see what you do after! Please, whenever you think I could help please feel like you can send me a message. Even if it's just to check in, I'd like to see how you're doing in your crypto career path.

# Issues

## **[Q-1]** Prefer Custom Errors over `require`

In your project you use the word `require` to check user input and contract state which reverts if the expression is false. The modern-Solidity way to do this is with custom errors, which are preferable because:
1) they allow you to include dynamic values (i.e. local variables) in the error
2) they are slightly more gas efficient

This is an excellent blog post by the Solidity team about custom errors if you are interested: https://blog.soliditylang.org/2021/04/21/custom-errors/

# Nitpicks

## **[N-1]** All projects has the same name and symbol

While having all created projects share the same `name` and `symbol` may not be considered a vulnerability, it would be beneficial to provide creators with the flexibility to name their projects and symbols. It is recommended to include this as part of the constructor.


# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | -     |
| Vulnerability              | -     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | -     |

Total: 0
