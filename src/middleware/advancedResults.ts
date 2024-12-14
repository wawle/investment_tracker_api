import { Request, NextFunction } from "express";
import { Document, Model } from "mongoose";

const advancedResults =
  (model: Model<Document>, populate?: string) =>
  async (req: Request, res: any, next: NextFunction): Promise<void> => {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ["select", "sort", "page", "limit"];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach((param) => delete reqQuery[param]);

    // Handle 'like' operator in the query
    Object.keys(reqQuery).forEach((key) => {
      if (
        reqQuery[key] &&
        typeof reqQuery[key] === "object" &&
        (reqQuery[key] as any)?.like
      ) {
        const value = (reqQuery[key] as any)?.like; // Get the value of 'like' (e.g., 'aap')
        reqQuery[key] = { $regex: value, $options: "i" }; // Apply a regex search
      }
    });

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    // Use aggregation to get custom sorting behavior
    const aggregation: any[] = [{ $match: JSON.parse(queryStr) }];

    // Select Fields
    if (req.query.select) {
      const fields = (req.query.select as string).split(",").join(" ");
      aggregation.push({ $project: { [fields]: 1 } });
    }

    // Handle sorting by ticker, treating numeric tickers as strings
    if (req.query.sort) {
      const sortBy = (req.query.sort as string).split(",").join(" ");

      // Handle custom sorting where "ticker" is sorted with numbers at the end
      if (sortBy.includes("ticker")) {
        aggregation.push({
          $addFields: {
            tickerSort: {
              $cond: {
                // Check if ticker starts with a number (instead of checking the entire string)
                if: { $regexMatch: { input: "$ticker", regex: "^[0-9]" } },
                then: 1, // Treat numbers as larger than alphabetic
                else: 0, // Non-numeric tickers come first
              },
            },
          },
        });

        // Now sort by `tickerSort` first, then by ticker alphabetically
        aggregation.push({ $sort: { tickerSort: 1, ticker: 1 } }); // First sort by 'tickerSort', then by 'ticker'
      } else {
        aggregation.push({ $sort: { [sortBy]: 1 } });
      }
    } else {
      aggregation.push({ $sort: { createdAt: -1 } });
    }

    // Pagination
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await model.countDocuments(JSON.parse(queryStr));

    aggregation.push({ $skip: startIndex });
    aggregation.push({ $limit: limit });

    if (populate) {
      aggregation.push({
        $lookup: {
          from: populate,
          localField: "_id",
          foreignField: "modelId",
          as: populate,
        },
      });
    }

    // Executing aggregation query
    const results = await model.aggregate(aggregation);

    // Pagination result
    const pagination: {
      next?: { page: number; limit: number };
      prev?: { page: number; limit: number };
    } = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.advancedResults = {
      success: true,
      total,
      pagination,
      data: results,
    };

    next();
  };

export default advancedResults;
