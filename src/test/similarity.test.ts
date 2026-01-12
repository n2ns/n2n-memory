import { expect } from "chai";
import {
    normalize,
    tokenize,
    jaccardSimilarity,
    containsSimilar,
    isSimilarObservation,
    deduplicateObservations,
    levenshteinDistance,
    levenshteinSimilarity,
    fuzzyMatchScore
} from "../utils/similarity.js";

describe("Similarity Utils", () => {

    describe("normalize", () => {
        it("should lowercase and trim strings", () => {
            expect(normalize("  Hello World  ")).to.equal("hello world");
        });

        it("should collapse multiple whitespace", () => {
            expect(normalize("hello   world")).to.equal("hello world");
        });
    });

    describe("tokenize", () => {
        it("should split into word set", () => {
            const tokens = tokenize("Hello, World!");
            expect(tokens.has("hello")).to.be.true;
            expect(tokens.has("world")).to.be.true;
        });

        it("should filter short words", () => {
            const tokens = tokenize("a is the test");
            expect(tokens.has("a")).to.be.false;
            expect(tokens.has("is")).to.be.true;
            expect(tokens.has("test")).to.be.true;
        });
    });

    describe("jaccardSimilarity", () => {
        it("should return 1 for identical strings", () => {
            expect(jaccardSimilarity("hello world", "hello world")).to.equal(1);
        });

        it("should return 0 for completely different strings", () => {
            expect(jaccardSimilarity("hello world", "foo bar")).to.equal(0);
        });

        it("should return partial similarity for overlapping words", () => {
            const sim = jaccardSimilarity("hello world", "hello there");
            expect(sim).to.be.greaterThan(0);
            expect(sim).to.be.lessThan(1);
        });
    });

    describe("containsSimilar", () => {
        it("should detect substring relationship", () => {
            expect(containsSimilar("hello", "hello world")).to.be.true;
            expect(containsSimilar("version 2.4", "version 2.4.1")).to.be.true;
        });

        it("should be case insensitive", () => {
            expect(containsSimilar("Hello", "HELLO WORLD")).to.be.true;
        });

        it("should return false for unrelated strings", () => {
            expect(containsSimilar("foo", "bar")).to.be.false;
        });
    });

    describe("isSimilarObservation", () => {
        it("should detect exact match after normalization", () => {
            expect(isSimilarObservation("Hello World", "hello world")).to.be.true;
        });

        it("should detect containment similarity", () => {
            expect(isSimilarObservation("version 2.4.1", "version 2.4.1 released")).to.be.true;
        });

        it("should detect high Jaccard similarity", () => {
            // Jaccard: words overlap significantly
            expect(isSimilarObservation(
                "TypeScript for type safety",
                "TypeScript provides type safety"
            )).to.be.true;
        });

        it("should not match unrelated observations", () => {
            expect(isSimilarObservation(
                "Uses React for UI",
                "Backend is written in Go"
            )).to.be.false;
        });
    });

    describe("deduplicateObservations", () => {
        it("should remove exact duplicates", () => {
            const obs = ["hello", "world", "hello"];
            expect(deduplicateObservations(obs)).to.deep.equal(["hello", "world"]);
        });

        it("should keep longer version of similar observations", () => {
            const obs = [
                "version 2.4.1",
                "version 2.4.1 is the current release"
            ];
            const result = deduplicateObservations(obs);
            expect(result.length).to.equal(1);
            expect(result[0]).to.equal("version 2.4.1 is the current release");
        });

        it("should merge observations with high word overlap", () => {
            const obs = [
                "Uses TypeScript",
                "Uses TypeScript for type checking"
            ];
            const result = deduplicateObservations(obs);
            expect(result.length).to.equal(1);
        });

        it("should preserve unrelated observations", () => {
            const obs = [
                "Uses React",
                "Backend in Node.js",
                "Tests with Jest"
            ];
            expect(deduplicateObservations(obs)).to.have.lengthOf(3);
        });

        it("should handle empty array", () => {
            expect(deduplicateObservations([])).to.deep.equal([]);
        });
    });

    describe("levenshteinDistance", () => {
        it("should return 0 for identical strings", () => {
            expect(levenshteinDistance("hello", "hello")).to.equal(0);
        });

        it("should count single character difference", () => {
            expect(levenshteinDistance("hello", "hallo")).to.equal(1);
        });

        it("should handle empty strings", () => {
            expect(levenshteinDistance("", "hello")).to.equal(5);
            expect(levenshteinDistance("hello", "")).to.equal(5);
        });

        it("should handle complete difference", () => {
            expect(levenshteinDistance("abc", "xyz")).to.equal(3);
        });
    });

    describe("levenshteinSimilarity", () => {
        it("should return 1 for identical strings", () => {
            expect(levenshteinSimilarity("hello", "hello")).to.equal(1);
        });

        it("should return high similarity for similar strings", () => {
            const sim = levenshteinSimilarity("hello", "hallo");
            expect(sim).to.be.greaterThan(0.7);
        });

        it("should return 0 for completely different strings of same length", () => {
            expect(levenshteinSimilarity("abc", "xyz")).to.equal(0);
        });
    });

    describe("fuzzyMatchScore", () => {
        it("should give highest score to exact substring match", () => {
            const score = fuzzyMatchScore("react", "Uses React for UI");
            expect(score).to.be.greaterThan(0.8);
        });

        it("should match with typos", () => {
            const score = fuzzyMatchScore("recat", "react");
            expect(score).to.be.greaterThan(0);
        });

        it("should give 0 for completely unrelated strings", () => {
            const score = fuzzyMatchScore("xyz123", "abcdef");
            expect(score).to.equal(0);
        });

        it("should handle word-level matches", () => {
            const score = fuzzyMatchScore("type safety", "TypeScript provides type safety");
            expect(score).to.be.greaterThan(0.5);
        });
    });
});
