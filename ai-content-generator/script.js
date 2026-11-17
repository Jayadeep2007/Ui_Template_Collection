
/* ---------- Draft builders (improved variation) ---------- */

function buildDraft({ type, topic, tone, length }) {
  const t = TONES[tone];
  const extra = { short: 0, medium: 1, long: 3 }[length];

  // Clean the user's prompt
  const topicText = topic.trim()
    .replace(/^(write|create|make|generate|draft|prepare)\s+(a|an|the)?\s*/i, "")
    .replace(/[.!?]+$/, "");

  const subject = topicText.charAt(0).toLowerCase() + topicText.slice(1);

  // Select different wording each time
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const introductions = {
    formal: [
      `In today's evolving landscape, ${subject} deserves careful attention.`,
      `A closer look at ${subject} reveals several interesting opportunities.`,
      `${titleCase(subject)} presents an opportunity to make a meaningful difference.`
    ],
    friendly: [
      `Let's explore ${subject} and why it matters.`,
      `Have you ever thought about ${subject}? Here's something worth sharing.`,
      `We're excited to talk about ${subject} with you!`
    ],
    playful: [
      `Ready to discover something exciting about ${subject}? Let's jump in!`,
      `Big ideas start somewhere, and today we're talking about ${subject}!`,
      `Here's something worth getting excited about: ${subject}!`
    ]
  };

  const benefits = [
    `One of the biggest advantages is the opportunity to make everyday tasks easier and more convenient.`,
    `What makes this interesting is how it can turn a simple idea into something genuinely useful.`,
    `It opens up new possibilities, saves valuable time, and makes the overall experience more enjoyable.`,
    `The real value comes from solving everyday challenges in a practical and accessible way.`,
    `Small improvements can make a surprisingly big difference, especially when they focus on people's actual needs.`
  ];

  const details = [
    `Start by understanding what people need most, then focus on the features and ideas that deliver real value.`,
    `Think about the experience from the user's perspective. Simple, thoughtful improvements can make all the difference.`,
    `With the right approach, even a challenging task can become easier to understand and manage.`,
    `The best results come from combining useful ideas with consistent effort and attention to detail.`
  ];

  const callsToAction = {
    formal: [
      `Explore the possibilities and consider how this could benefit you.`,
      `Take the next step and discover the opportunities available.`,
      `We invite you to learn more and experience the difference.`
    ],
    friendly: [
      `Why not give it a try? We'd love to hear what you think!`,
      `Give it a go and share your experience with us!`,
      `Have a look, explore the possibilities, and let us know your thoughts.`
    ],
    playful: [
      `Don't just imagine it. Give it a try and see the magic happen!`,
      `Your next exciting experience starts here. Let's go!`,
      `Ready to give it a spin? Let's make it happen!`
    ]
  };

  const paragraphs = [];

  // BLOG
  if (type === "blog") {
    const title = titleCase(subject);

    paragraphs.push(
      pick(introductions[tone])
    );

    paragraphs.push(
      `${titleCase(subject)} is more than just an interesting topic. ${pick(benefits)}`
    );

    if (extra >= 1) {
      paragraphs.push(
        pick(details)
      );
    }

    if (extra >= 3) {
      paragraphs.push(
        `Another important factor is consistency. Pay attention to what works, learn from the experience, and keep improving. Over time, these small steps can lead to meaningful results.`
      );

      paragraphs.push(
        `Ultimately, success comes from understanding the purpose, making informed decisions, and taking action at the right time.`
      );
    }

    paragraphs.push(
      pick(callsToAction[tone])
    );

    return { title, paras: paragraphs };
  }

  // EMAIL
  if (type === "email") {
    const greetings = {
      formal: "Dear Reader,",
      friendly: "Hi there,",
      playful: "Hey there!",
    };

    const endings = {
      formal: "Best regards,\nThe Team",
      friendly: "Warmly,\nThe Team",
      playful: "Cheers,\nThe Team",
    };

    const emailOpenings = {
      formal: `We are pleased to share some information about ${subject}.`,
      friendly: `We wanted to share something interesting with you about ${subject}.`,
      playful: `We've got something exciting to tell you about ${subject}!`
    };

    paragraphs.push(
      pick([greetings[tone]])
    );

    paragraphs.push(
      pick([emailOpenings[tone]])
    );

    paragraphs.push(
      pick(benefits)
    );

    if (extra >= 1) {
      paragraphs.push(
        pick(details)
      );
    }

    if (extra >= 3) {
      paragraphs.push(
        `We believe this is a great opportunity to explore something new and discover its potential. We hope you find it as useful and exciting as we do.`
      );
    }

    paragraphs.push(
      pick(callsToAction[tone])
    );

    paragraphs.push(
      endings[tone]
    );

    return {
      title: `Subject: ${titleCase(subject)}`,
      paras: paragraphs
    };
  }

  // CAPTION
  if (type === "caption") {
    const captionOpenings = {
      formal: [
        `Introducing ${subject}.`,
        `Discover something new: ${subject}.`,
        `A closer look at ${subject}.`
      ],
      friendly: [
        `Something exciting is here! ${titleCase(subject)} ✨`,
        `A little something worth sharing: ${subject} 💚`,
        `Good things deserve the spotlight. ${titleCase(subject)}!`
      ],
      playful: [
        `🚀 Ready for something new? ${titleCase(subject)}!`,
        `✨ New vibes, new possibilities: ${subject}!`,
        `🎉 Here's something you don't want to miss: ${subject}!`
      ]
    };

    paragraphs.push(
      pick(captionOpenings[tone])
    );

    paragraphs.push(
      pick(benefits)
    );

    if (extra >= 1) {
      paragraphs.push(
        pick(callsToAction[tone])
      );
    }

    if (extra >= 3) {
      paragraphs.push(
        `Discover more, share with friends, and be part of the experience!`
      );
    }

    const hashtags = subject
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 3)
      .map(word => "#" + word.replace(/\W/g, ""));

    paragraphs.push(
      hashtags.join(" ") + " #Explore #NewIdeas"
    );

    return {
      title: "Social Media Caption",
      paras: paragraphs
    };
  }

  return {
    title: titleCase(subject),
    paras: [pick(introductions[tone]), pick(benefits)]
  };
}

const titleCase = (s) =>
  s.replace(/\b\w/g, (c) => c.toUpperCase());
