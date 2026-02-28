# Prompt MD

Promptmd is a CLI tool for running, chaining, and looping prompts defined in markdown files. 

## Usage

Simple prompt

```sh
echo "Check the weather in Berlin" > weather.md
promd weather
```

Chaining prompts

```sh
echo "Check the weather in Berlin" > weather.md
echo "Suggest activities in Berlin based on the provided weather forecast: {{input}}" > plan-activities.md
promd "weather > plan-activities"
```

Use specify arguments

```sh
echo "Check the weather in {{city}}" > weather.md
echo "Suggest activities in {{city}} based on the provided weather forecast: {{input}}" > plan-activities.md
promd "weather > plan-activities" --city Hamburg
```

Use structured output via frontmatter

*weather.md*
```
output:
    temperature: "the forecasted temperature"
    rain: "will it rain?"
---
Check the weather in Berlin
```

```sh
echo "Suggest activities in Berlin. Temperature: {{input.temperature}} Rain: {{input.rain}}" > plan-activities.md
promd "weather > plan-activities" 
```

Chain all prompts in the current directory

```sh
promd .
```

Run in a loop

```sh
promd loop --count 10 --exitOn "<promise>Complete</promise>" ./my-workflow
```


